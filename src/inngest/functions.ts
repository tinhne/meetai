import { StreamTranscriptItem } from "@/modules/meetings/types";
import { inngest } from "./client";
import JSONL from "jsonl-parse-stringify";
import { db } from "@/db";
import { agents, meetings, user } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { createAgent, gemini, TextMessage } from "@inngest/agent-kit";
import { generateAvatar } from "@/lib/avatar";
import { streamChat } from "@/lib/stream-chat";
// import OpenAI from "openai";
// import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

const summarizer = createAgent({
  name: "Summarizer",
  system: `
    You are an expert summarizer. You write readable, concise, simple content. You are given a transcript of a meeting and you need to summarize it.

Use the following markdown structure for every output:

### Overview
Provide a detailed, engaging summary of the session's content. Focus on major features, user workflows, and any key takeaways. Write in a narrative style, using full sentences. Highlight unique or powerful aspects of the product, platform, or discussion.

### Notes
Break down key content into thematic sections with timestamp ranges. Each section should summarize key points, actions, or demos in bullet format.

Example:
#### Section Name
- Main point or demo shown here
- Another key insight or interaction
- Follow-up tool or explanation provided

#### Next Section
- Feature X automatically does Y
- Mention of integration with Z
  `.trim(),
  model: gemini({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_AI_API_KEY,
  }),
});

export const meetingsProcessing = inngest.createFunction(
  { id: "meetings/processing" },
  { event: "meetings/processing" },
  async ({ event, step }) => {
    const response = await step.run("fetch-transcript", async () => {
      return fetch(event.data.transcriptUrl).then((res) => res.text());
    });

    const transcript = await step.run("parse-transcript", async () => {
      return JSONL.parse<StreamTranscriptItem>(response);
    });

    const transcriptWithSpeakers = await step.run("add-speakers", async () => {
      const speakerIds = [
        ...new Set(transcript.map((item) => item.speaker_id)),
      ];

      const userSpeakers = await db
        .select()
        .from(user)
        .where(inArray(user.id, speakerIds))
        .then((users) =>
          users.map((user) => ({
            ...user,
          })),
        );
      const agentSpeakers = await db
        .select()
        .from(agents)
        .where(inArray(agents.id, speakerIds))
        .then((agents) =>
          agents.map((agent) => ({
            ...agent,
          })),
        );

      const speakers = [...userSpeakers, ...agentSpeakers];

      return transcript.map((item) => {
        const speaker = speakers.find(
          (speaker) => speaker.id === item.speaker_id,
        );

        if (!speaker) {
          return {
            ...item,
            user: {
              name: "Unknown User",
            },
          };
        }

        return {
          ...item,
          user: {
            name: speaker.name,
          },
        };
      });
    });

    const { output } = await summarizer.run(
      "Summarize the following meeting transcript:\n\n" +
        JSON.stringify(transcriptWithSpeakers),
    );

    await step.run("save-summary", async () => {
      await db
        .update(meetings)
        .set({
          summary: (output[0] as TextMessage).content as string,
          status: "completed",
        })
        .where(eq(meetings.id, event.data.meetingId));
    });
  },
);

const chatAgent = createAgent({
  name: "Chat Agent",
  system: "You are a helpful AI assistant.",
  model: gemini({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_AI_API_KEY,
  }),
});

export const chatMessageProcessing = inngest.createFunction(
  { id: "chat/message.new" },
  { event: "chat/message.new" },
  async ({ event }) => {
    const {
      channelId,
      text,
      agentId,
      agentName,
      agentInstructions,
      meetingSummary,
    } = event.data;

    const channel = streamChat.channel("messaging", channelId);
    await channel.watch();

    const previousMessages = channel.state.messages
      .slice(-5)
      .filter((msg) => msg.text && msg.text.trim() !== "")
      .map((msg) => ({
        role: msg.user?.id === agentId ? "assistant" : "user",
        content: msg.text || "",
      }));

    const instructions = `
You are an AI assistant helping the user revisit a recently completed meeting.
Below is a summary of the meeting, generated from the transcript:

${meetingSummary}

${agentInstructions}

Be concise, helpful, and focus on providing accurate information from the meeting.

Recent conversation history:
${previousMessages.map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`).join("\n")}
    `.trim();

    const { output } = await chatAgent.run(`${instructions}\n\nUser: ${text}`);

    let GPTResponseText = "";

    try {
      const { output } = await chatAgent.run(
        `${instructions}\n\nUser: ${text}`,
      );
      GPTResponseText = (output[0] as TextMessage)?.content as string;
    } catch (err: any) {
      console.error("AI error:", err?.error?.message || err.message);

      if (err?.error?.code === 429) {
        GPTResponseText =
          "I'm currently rate limited. Please wait a moment and try again.";
      } else {
        GPTResponseText = "Something went wrong while generating a response.";
      }
    }

    if (!GPTResponseText) return;

    const avatarUrl = generateAvatar(agentName, "initials");

    await streamChat.upsertUser({
      id: agentId,
      name: agentName,
      image: avatarUrl,
    });

    await channel.sendMessage({
      text: GPTResponseText,
      user_id: agentId,
    });
  },
);
