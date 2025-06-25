require("dotenv").config();
import { GoogleGenAI } from "@google/genai";
import express from 'express'
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import {basePrompt as nodeBasePrompt} from "./defaults/node";
import {basePrompt as reactBasePrompt} from "./defaults/react";
import cors from "cors";


const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const app = express()
app.use(express.json())
const corsOptions = {
    origin: "*", // Allow only frontend running on port 5174 (now allow from everywhere)
    methods: "GET,POST,PUT,DELETE",
    credentials: true, // Allow cookies or authentication headers
  };
app.use(cors(corsOptions))



app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;
  const systemInstruction = "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    // contents: prompt,
    contents: [
      {
        role: "user",
        // Combine the system instruction with the actual user prompt
        // Use "\n\n" for clear separation, or adapt based on prompt engineering best practices for your specific use case
        parts: [{ text: systemInstruction + "\n\n" + prompt }]
      }
    ],
  });
  // console.log(response.text)
  const final = response.text
  if (final === "react"){
    res.json({
      prompts :  [BASE_PROMPT,`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
      uiPrompts : [reactBasePrompt]
    })
    return;
  }

  if (final === "node"){
    res.json({
      prompts :  [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
      uiPrompts: [nodeBasePrompt]
    })
    return;
  }

  res.status(403).json({
    message : "you cant access this dude"
  })
  return;
})

// app.post("/chat", async (req, res) => {
//   const messages = req.body.messages; // Expected format: [{ role: 'user', parts: [{ text: 'Hello' }] }, ...]

//   try {
//     const response = await ai.models.generateContent({
//       model: "gemini-1.5-flash-latest",
//       contents: [
//         {
//           role: "system",
//           parts: [{ text: getSystemPrompt() }],
//         },
//         ...messages
//       ],
//     });

//     const textResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

//     console.log(textResponse);

//     res.json({ response: textResponse });
//   } catch (error) {
//     console.error("Error from Gemini:", error);
//     res.status(500).json({ error: "Failed to generate response" });
//   }
// });

app.post("/chat", async (req, res) => {
  const rawMessages = req.body.messages;

  const systemPrompt = getSystemPrompt();

  // Merge system prompt into the first user message
  const messages = rawMessages.map((msg: { content: any; role: any; }, index: number) => {
    const mergedContent = index === 0 ? `${systemPrompt}\n\n${msg.content}` : msg.content;
    return {
      role: msg.role, // Must be only "user" or "model"
      parts: [{ text: mergedContent }],
    };
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages,
      
    });
    console.log("I am hereeeee")
    const textResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
    res.json({ response: textResponse });
  } catch (error) {
    console.error("Error from Gemini:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});





app.listen(3000)