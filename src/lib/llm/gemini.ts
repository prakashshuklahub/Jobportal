import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-2.0-flash";

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: MODEL });
}

async function generateText(prompt: string): Promise<string> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// --- Future feature: tailored resume generation (Gemini) ---

export async function generateTailoredResume(
  jobTitle: string,
  company: string,
  jobDescription: string,
  resumeText: string,
  skills: string[]
): Promise<string> {
  return generateText(`Tailor this resume for the job application below. Keep it concise, professional, and highlight relevant skills. Output in clean markdown format.

**Job Title:** ${jobTitle}
**Company:** ${company}
**Key Skills to Emphasize:** ${skills.join(", ")}

**Job Description:**
${jobDescription.slice(0, 3000)}

**Base Resume:**
${resumeText || "Experienced software engineer seeking new opportunities."}

Generate a tailored resume that emphasizes matching experience and skills.`);
}

// --- Future feature: cover letter generation (Gemini) ---

export async function generateCoverLetter(
  jobTitle: string,
  company: string,
  jobDescription: string,
  resumeText: string,
  skills: string[]
): Promise<string> {
  return generateText(`Write a professional cover letter for this job application. Keep it to 3-4 paragraphs. Output in clean markdown format.

**Job Title:** ${jobTitle}
**Company:** ${company}
**Applicant Skills:** ${skills.join(", ")}

**Job Description:**
${jobDescription.slice(0, 3000)}

**Applicant Background:**
${resumeText || "Experienced software engineer with a passion for building great products."}

Write a compelling, personalized cover letter.`);
}
