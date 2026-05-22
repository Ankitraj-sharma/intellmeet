const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const logger = require('../utils/logger');

// Helper: call OpenAI API
const callOpenAI = async (prompt, systemPrompt) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Demo mode: return mock response
      return getMockAIResponse(prompt);
    }

    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    logger.error(`OpenAI API error: ${error.message}`);
    return getMockAIResponse(prompt);
  }
};

// Demo mock responses when no API key
const getMockAIResponse = (prompt) => {
  if (prompt.includes('summary')) {
    return JSON.stringify({
      summary: 'The team discussed project timelines, resource allocation, and upcoming deliverables. Key decisions were made regarding the Q2 roadmap and technical architecture choices.',
      keyPoints: [
        'Q2 roadmap finalized with 3 major feature releases',
        'Backend team to adopt microservices architecture',
        'Weekly sync meetings scheduled every Monday at 10 AM',
        'Customer feedback integration to be prioritized',
      ],
      sentiment: 'positive',
    });
  }

  if (prompt.includes('action items')) {
    return JSON.stringify({
      actionItems: [
        { description: 'Prepare Q2 project roadmap document', assignee: null, priority: 'high', dueDate: null },
        { description: 'Review and finalize technical architecture proposal', assignee: null, priority: 'high', dueDate: null },
        { description: 'Schedule follow-up meeting with design team', assignee: null, priority: 'medium', dueDate: null },
        { description: 'Update project tracking board with new milestones', assignee: null, priority: 'low', dueDate: null },
      ],
    });
  }

  return 'AI processing complete.';
};

// @desc    Generate AI summary for meeting
// @route   POST /api/ai/meetings/:id/summarize
// @access  Private
exports.generateSummary = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });

    // Prepare transcript text
    let transcriptText = '';
    if (meeting.transcript && meeting.transcript.length > 0) {
      transcriptText = meeting.transcript
        .map(t => `${t.speakerName || 'Speaker'}: ${t.text}`)
        .join('\n');
    } else {
      // Use meeting title + description as context if no transcript
      transcriptText = `Meeting: ${meeting.title}\n${meeting.description || 'No description provided.'}`;
    }

    const systemPrompt = `You are an expert meeting intelligence AI. Analyze meeting transcripts and generate concise, actionable summaries. Always respond with valid JSON only, no markdown.`;

    const userPrompt = `Generate a comprehensive summary for this meeting transcript. Return JSON with: summary (string), keyPoints (array of strings, max 6), sentiment ("positive"|"neutral"|"negative").

Meeting Title: ${meeting.title}
Transcript:
${transcriptText}`;

    const response = await callOpenAI(userPrompt, systemPrompt);

    let parsed;
    try {
      parsed = JSON.parse(response.replace(/```json|```/g, '').trim());
    } catch {
      parsed = {
        summary: response,
        keyPoints: [],
        sentiment: 'neutral',
      };
    }

    meeting.aiSummary = {
      text: parsed.summary,
      generatedAt: new Date(),
      keyPoints: parsed.keyPoints || [],
      sentiment: parsed.sentiment || 'neutral',
    };

    await meeting.save();

    res.json({ success: true, aiSummary: meeting.aiSummary });
  } catch (error) {
    next(error);
  }
};

// @desc    Extract action items from transcript
// @route   POST /api/ai/meetings/:id/extract-actions
// @access  Private
exports.extractActionItems = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('participants.user', 'name email');

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });

    const participantNames = meeting.participants.map(p => p.user?.name || 'Unknown').join(', ');

    let transcriptText = '';
    if (meeting.transcript && meeting.transcript.length > 0) {
      transcriptText = meeting.transcript
        .map(t => `${t.speakerName}: ${t.text}`)
        .join('\n');
    } else {
      transcriptText = `Meeting: ${meeting.title}\n${meeting.description || ''}`;
    }

    const systemPrompt = `You are an expert at identifying action items from meeting transcripts. Extract clear, specific, assignable tasks. Always respond with valid JSON only, no markdown.`;

    const userPrompt = `Extract all action items from this meeting. Participants: ${participantNames}. 
Return JSON with actionItems array, each item having: description (string), assigneeName (string or null), priority ("low"|"medium"|"high"), dueDate (ISO string or null).

Transcript:
${transcriptText}`;

    const response = await callOpenAI(userPrompt, systemPrompt);

    let parsed;
    try {
      parsed = JSON.parse(response.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { actionItems: [] };
    }

    // Add extracted action items to meeting
    const newItems = (parsed.actionItems || []).map(item => ({
      description: item.description,
      assigneeName: item.assigneeName || '',
      priority: item.priority || 'medium',
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
      status: 'pending',
    }));

    meeting.actionItems.push(...newItems);
    await meeting.save();

    // Also create Task documents for team tracking
    if (meeting.team) {
      const taskPromises = newItems.map(item =>
        Task.create({
          title: item.description,
          priority: item.priority,
          dueDate: item.dueDate,
          team: meeting.team,
          meeting: meeting._id,
          createdBy: req.user._id,
          status: 'todo',
        })
      );
      await Promise.all(taskPromises);
    }

    res.json({ success: true, actionItems: meeting.actionItems });
  } catch (error) {
    next(error);
  }
};

// @desc    Transcribe audio (mock/webhook endpoint)
// @route   POST /api/ai/meetings/:id/transcribe
// @access  Private
exports.addTranscriptEntry = async (req, res, next) => {
  try {
    const { text, speakerName, confidence } = req.body;
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });

    const entry = {
      speaker: req.user._id,
      speakerName: speakerName || req.user.name,
      text,
      timestamp: new Date(),
      confidence: confidence || 0.9,
    };

    meeting.transcript.push(entry);
    await meeting.save();

    // Emit to meeting room
    req.io?.to(meeting.meetingId).emit('transcript:new', entry);

    res.json({ success: true, entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Get meeting insights & analytics
// @route   GET /api/ai/meetings/:id/insights
// @access  Private
exports.getMeetingInsights = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('participants.user', 'name');

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });

    const insights = {
      duration: meeting.duration ? `${Math.floor(meeting.duration / 60)} minutes` : 'N/A',
      participantCount: meeting.participants.length,
      transcriptLength: meeting.transcript.length,
      actionItemCount: meeting.actionItems.length,
      completedActions: meeting.actionItems.filter(a => a.status === 'done').length,
      sentiment: meeting.aiSummary?.sentiment || 'neutral',
      speakerBreakdown: {},
    };

    // Calculate speaker breakdown
    meeting.transcript.forEach(entry => {
      const name = entry.speakerName || 'Unknown';
      insights.speakerBreakdown[name] = (insights.speakerBreakdown[name] || 0) + 1;
    });

    res.json({ success: true, insights });
  } catch (error) {
    next(error);
  }
};
