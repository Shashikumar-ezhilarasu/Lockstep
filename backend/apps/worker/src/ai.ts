import pino from 'pino';
const logger = pino({ name: 'worker-ai' });

export async function generateFailureSummary(
  job: any,
  error: any,
  queueName: string,
  attemptsMade: number
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('GEMINI_API_KEY is not set. Skipping AI summary generation.');
    return null;
  }

  const prompt = `Analyze this background job failure and provide exactly 1-2 prose sentences containing:
1. The likely cause of the failure.
2. One concrete suggested next step to resolve it.

Do NOT use markdown, bullet points, or lists. Just plain English prose.

Queue: ${queueName}
Attempts Made: ${attemptsMade}
Error:
${typeof error === 'string' ? error : JSON.stringify(error, null, 2)}

Job Payload:
${JSON.stringify(job.payload, null, 2)}`;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 8000); // 8-second timeout

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: abortController.signal,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary || typeof summary !== 'string') {
      throw new Error('Malformed response from Gemini API: missing text content');
    }

    return summary.trim();
  } catch (err) {
    logger.error({ err }, 'Failed to generate AI failure summary');
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
