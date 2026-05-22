const OpenAI = require('openai');
const Meeting = require('../models/Meeting');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate AI meeting summary from transcript
 */
const generateMeetingSummary = async (meetingId) => {
  try {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting || !meeting.transcript?.fullText) {
      throw new Error('No transcript available');
    }

    const prompt = `You are an expert meeting analyst. Analyze the following meeting transcript and provide a structured JSON response.

Meeting Title: ${meeting.title}
Duration: ${meeting.durationMinutes} minutes
Transcript:
${meeting.transcript.fullText}

Return ONLY a valid JSON object with this exact structure:
{
  "summary": "2-3 sentence executive summary",
  "keyPoints": ["key point 1", "key point 2", "...up to 5 key points"],
  "decisions": ["decision 1", "decision 2"],
  "actionItems": [
    {
      "text": "specific action item",
      "priority": "high|medium|low",
      "dueDate": "suggested due date or null"
    }
  ],
  "sentiment": "positive|neutral|negative",
  "accuracy": 0.92
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    });

    const aiData = JSON.parse(response.choices[0].message.content);

    meeting.aiSummary = {
      summary: aiData.summary,
      keyPoints: aiData.keyPoints || [],
      decisions: aiData.decisions || [],
      actionItems: aiData.actionItems?.map(item => ({
        text: item.text,
        priority: item.priority || 'medium',
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
        status: 'pending',
      })) || [],
      sentiment: aiData.sentiment || 'neutral',
      accuracy: aiData.accuracy || 0.85,
      isGenerated: true,
      generatedAt: new Date(),
    };

    await meeting.save();
    logger.info(`AI summary generated for meeting: ${meeting.meetingId}`);
    return meeting.aiSummary;
  } catch (error) {
    logger.error(`AI summary generation error for meeting ${meetingId}: ${error.message}`);
    throw error;
  }
};

/**
 * Transcribe audio using OpenAI Whisper
 */
const transcribeAudio = async (audioBuffer, mimeType = 'audio/webm') => {
  try {
    const { Readable } = require('stream');
    const stream = Readable.from(audioBuffer);
    stream.path = 'audio.webm';

    const response = await openai.audio.transcriptions.create({
      file: stream,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    return {
      text: response.text,
      segments: response.segments?.map(s => ({
        text: s.text,
        startTime: s.start,
        endTime: s.end,
        confidence: s.no_speech_prob ? 1 - s.no_speech_prob : 0.9,
      })) || [],
    };
  } catch (error) {
    logger.error(`Transcription error: ${error.message}`);
    throw error;
  }
};

/**
 * Extract action items from text using AI
 */
const extractActionItems = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Extract all action items from this text. Return JSON array of objects with {text, priority, assignee (name if mentioned), dueDate}. Text: ${text}`,
      }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 800,
    });

    const data = JSON.parse(response.choices[0].message.content);
    return data.actionItems || data.items || [];
  } catch (error) {
    logger.error(`Action item extraction error: ${error.message}`);
    return [];
  }
};

module.exports = { generateMeetingSummary, transcribeAudio, extractActionItems };
