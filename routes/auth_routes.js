const axios = require("axios");
const express = require("express");
const OpenAI = require("openai");
const { OAuth2Client } = require("google-auth-library");

require("dotenv").config();
const AuthRouter = express.Router();

const { connect } = require("../utils/redis_connection");

// google oauth configuration
const oAuth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

//Defining some scopes
const scopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
];

//Get Route for Google Authentication
AuthRouter.get("/auth/google", (req, res) => {
  try {
    //Generating the Auth Url
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });
    res.status(200);
    res.redirect(authUrl);
  } catch (error) {
    res
      .status(500)
      .json({ message: `Internal Server Error` });
  }
});

let accessToken;

//Get Route for Google Authentication
AuthRouter.get(
  "/auth/google/callback",
  async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res
        .status(400)
        .send("Authorization code missing.");
    }
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      const { access_token } = tokens;
      accessToken = access_token;
    } catch (error) {
      res
        .status(500)
        .send("Error exchanging authorization code.");
    }
  }
);

// getting user profile details
const getUser = async (req, res) => {
  try {
    const token = accessToken;
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/profile`;

    //if there is no token
    if (!token) {
      return res.send(
        "Token not found , Please login again to get token"
      );
    }

    //setting up with redis data structure
    connect.setex(req.params.email, 3600, token);

    //setting up with Authentication Token configuration
    const response = await axios({
      method: "GET",
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    //return data
    res.json(response.data);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

// creating the instance of OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_SECRECT_KEY,
});

//Sending Email automatically of the user
const sendMail = async (data, token) => {
  try {
    //check whether the token is valid or not
    if (!token) {
      throw new Error(
        "Token not found, please login again to get token"
      );
    }

    //write some prompt for chatgpt
    const emailContent = `dont use any name instead use dear user.
                          here you have to create advertisement mail, 
                          your reply should provide an enticing advertisement for our ReachInbox platform. 
                          Highlight the key features and benefits to capture their interest and encourage them to learn more. 
                          Here's a suggested prompt:\n\n'Hello!\n\nWe're thrilled to introduce you to ReachInbox – the ultimate email management platform designed to streamline your communication workflows and boost your productivity.
                          \n\nDiscover how ReachInbox can transform your email experience:\n\n- **Secure Mailing:** Rest assured that your emails are protected with state-of-the-art encryption, keeping your communication private and secure.
                          \n\n- **Automated Emails:** Say goodbye to manual tasks! With ReachInbox, you can automate your email workflows, schedule emails, and set triggers to send messages at the perfect time.
                          \n\n- **Customizable Templates:** Personalize your emails effortlessly! Create stunning templates tailored to your brand and audience, saving you time and effort.
                          \n\nReady to supercharge your email productivity? Reply to this email to learn more about ReachInbox and take your communication to the next level.
                          \n\nDon't miss out on this opportunity to revolutionize your inbox with ReachInbox.
                           Get started today! . give this form of containers heading, features and benefits`;

    // Creates a model response for the given chat conversation
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0301",
      max_tokens: 350,
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: emailContent,
        },
      ],
    });

    //getting replied message return by chatgpt
    const RepliedData =
      response.choices[0]?.message?.content;

    //setting up with mail Options data
    const mailOptions = {
      from: data.from,
      to: data.to,
      subject: `${data.label} of ReachInBox`,
      text: `${data.label} of ReachInBox`,
      html: `
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; text-align: center; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">Exciting Offer from Reach-In Box!</h2>
          <p style="font-size: 16px; color: #666;">Dear valued customer,</p>
          <p style="font-size: 16px; color: #666;">${RepliedData}</p>
          <p style="font-size: 16px; color: #666;">Best regards,</p>
          <p style="font-size: 16px; color: #666;"><strong>Shraddha Gawde</strong><br>Reach-In Box</p>
        </div>`,
    };

    // creating raw data in the form of Buffer
    const emailData = {
      raw: Buffer.from(
        [
          "Content-type: text/html;charset=iso-8859-1",
          "MIME-Version: 1.0",
          `from: ${data.from}`,
          `to: ${data.to}`,
          `subject: ${mailOptions.subject}`,
          `text: ${mailOptions.text}`,
          `html: ${mailOptions.html}`,
        ].join("\n")
      ).toString("base64"),
    };

    //making a post request for sending message Respnse
    const sendMessageResponse = await axios.post(
      `https://gmail.googleapis.com/gmail/v1/users/${data.from}/messages/send`,
      emailData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Modify label for the sent email
    const labelUrl = `https://gmail.googleapis.com/gmail/v1/users/${data.from}/messages/${sendMessageResponse.data.id}/modify`;

    //
    const labelConfig = {
      method: "POST",
      url: labelUrl,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        addLabelIds: ["Label_4"],
      },
    };
    await axios(labelConfig);

    return sendMessageResponse.data.id;
  } catch (error) {
    console.error("Error sending email:", error);
    res
      .status(400)
      .json({ message: "Error while sending the email" });
  }
};

module.exports = {
  AuthRouter,
  sendMail,
  getUser,
};
