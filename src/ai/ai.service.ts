import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { TasksService } from '../tasks/tasks.service';
import { ConfigService } from '@nestjs/config';

// Note: You'll need to install OpenAI SDK: npm install openai
// For now, this is a mock implementation
@Injectable()
export class AIService {
  private openaiApiKey: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    private readonly configService: ConfigService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
  }

  // Generic AI interaction
  async createAIInteraction(data: {
    type: string;
    prompt?: string;
    response: string;
    context?: any;
    userId?: string;
    meetingId?: string;
    taskId?: string;
    documentId?: string;
    repositoryId?: string;
    model?: string;
    tokensUsed?: number;
    cost?: number;
  }) {
    return this.prisma.aIInteraction.create({
      data: {
        type: data.type,
        prompt: data.prompt,
        response: data.response,
        context: data.context,
        userId: data.userId,
        meetingId: data.meetingId,
        taskId: data.taskId,
        documentId: data.documentId,
        repositoryId: data.repositoryId,
        model: data.model || 'gpt-4',
        tokensUsed: data.tokensUsed,
        cost: data.cost,
      },
    });
  }

  // Meeting Summary
  async generateMeetingSummary(meetingId: string, transcription?: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        minutes: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // If transcription is provided, use it; otherwise use meeting description
    const content = transcription || meeting.description || '';

    // Mock AI call - Replace with actual OpenAI API call
    const summary = await this.callAI({
      systemPrompt: `You are a meeting assistant. Summarize the meeting and extract:
1. Key discussion points
2. Decisions made
3. Action items with assignees
4. Next steps

Format the response as JSON with: { summary, keyPoints: [], decisions: [], actionItems: [] }`,
      userPrompt: `Meeting: ${meeting.title}\nDescription: ${content}\nParticipants: ${meeting.participants.map(p => p.user.name).join(', ')}`,
    });

    // Parse AI response
    let parsedSummary;
    try {
      parsedSummary = typeof summary === 'string' ? JSON.parse(summary) : summary;
    } catch {
      parsedSummary = { summary, keyPoints: [], decisions: [], actionItems: [] };
    }

    // Save AI summary
    const aiSummary = await this.prisma.aISummary.create({
      data: {
        type: 'meeting',
        summary: parsedSummary.summary || summary,
        keyPoints: parsedSummary.keyPoints || [],
        actionItems: parsedSummary.actionItems || [],
        relatedId: meetingId,
        relatedType: 'meeting',
      },
    });

    // Create tasks from action items
    if (parsedSummary.actionItems && Array.isArray(parsedSummary.actionItems)) {
      for (const item of parsedSummary.actionItems) {
        if (item.task && item.assignee) {
          // Find user by name
          const assignee = meeting.participants.find(
            p => p.user.name.toLowerCase().includes(item.assignee.toLowerCase())
          );

          if (assignee) {
            await this.tasksService.create({
              title: item.task,
              description: `Auto-generated from meeting: ${meeting.title}`,
              assigneeId: assignee.userId,
              teamId: meeting.teamId || undefined,
              meetingId: meeting.id,
              priority: 'medium',
            });
          }
        }
      }
    }

    // Save interaction
    await this.createAIInteraction({
      type: 'meeting_summary',
      prompt: content,
      response: aiSummary.summary,
      context: { meetingId, participants: meeting.participants.length },
      meetingId,
      model: 'gpt-4',
    });

    // Notify participants
    for (const participant of meeting.participants) {
      await this.notificationsService.create({
        userId: participant.userId,
        type: 'ai_summary_generated',
        title: 'Meeting Summary Ready',
        message: `AI summary generated for: ${meeting.title}`,
        relatedId: meetingId,
        relatedType: 'meeting',
      });
    }

    this.eventsGateway.server
      .to(`meeting:${meetingId}`)
      .emit('ai:summary:generated', aiSummary);

    return aiSummary;
  }

  // Code Review
  async generateCodeReview(pullRequestId: string, codeDiff?: string) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: {
        repository: true,
        creator: true,
      },
    });

    if (!pr) {
      throw new NotFoundException('Pull request not found');
    }

    // Mock AI code review
    const review = await this.callAI({
      systemPrompt: `You are a senior code reviewer. Review the code and provide:
1. Critical issues (security, bugs)
2. Code quality suggestions
3. Best practices recommendations
4. Overall score (0-100)

Format as JSON: { suggestions: [{ file, line, issue, severity, suggestion }], overallScore, summary }`,
      userPrompt: `PR: ${pr.title}\nDescription: ${pr.description}\nCode Diff: ${codeDiff || 'N/A'}`,
    });

    let parsedReview;
    try {
      parsedReview = typeof review === 'string' ? JSON.parse(review) : review;
    } catch {
      parsedReview = {
        suggestions: [],
        overallScore: 75,
        summary: review,
      };
    }

    const aiCodeReview = await this.prisma.aICodeReview.create({
      data: {
        pullRequestId,
        suggestions: parsedReview.suggestions || [],
        overallScore: parsedReview.overallScore,
        summary: parsedReview.summary || review,
      },
    });

    await this.createAIInteraction({
      type: 'code_review',
      prompt: codeDiff || pr.description || '',
      response: aiCodeReview.summary,
      context: { pullRequestId, repositoryId: pr.repositoryId },
      repositoryId: pr.repositoryId,
      model: 'gpt-4',
    });

    // Notify PR creator
    await this.notificationsService.create({
      userId: pr.creatorId,
      type: 'ai_code_review',
      title: 'AI Code Review Complete',
      message: `AI reviewed your PR: ${pr.title}`,
      relatedId: pullRequestId,
      relatedType: 'pullrequest',
    });

    this.eventsGateway.server
      .to(`pullrequest:${pullRequestId}`)
      .emit('ai:review:generated', aiCodeReview);

    return aiCodeReview;
  }

  // Task Suggestions
  async generateTaskSuggestions(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
        team: true,
        meeting: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const suggestion = await this.callAI({
      systemPrompt: `You are a project management assistant. Analyze the task and provide:
1. Priority recommendation (high/medium/low)
2. Estimated time
3. Reasoning
4. Suggestions for improvement

Format as JSON: { priority, estimatedTime, reasoning, suggestions }`,
      userPrompt: `Task: ${task.title}\nDescription: ${task.description || ''}\nCurrent Priority: ${task.priority}\nStatus: ${task.status}`,
    });

    let parsedSuggestion;
    try {
      parsedSuggestion = typeof suggestion === 'string' ? JSON.parse(suggestion) : suggestion;
    } catch {
      parsedSuggestion = {
        priority: task.priority,
        estimatedTime: 60,
        reasoning: suggestion,
        suggestions: [],
      };
    }

    const aiTaskSuggestion = await this.prisma.aITaskSuggestion.create({
      data: {
        taskId,
        suggestion: parsedSuggestion.suggestions?.join(', ') || suggestion,
        priority: parsedSuggestion.priority,
        reasoning: parsedSuggestion.reasoning,
        estimatedTime: parsedSuggestion.estimatedTime,
      },
    });

    await this.createAIInteraction({
      type: 'task_suggestion',
      prompt: `${task.title}: ${task.description}`,
      response: aiTaskSuggestion.suggestion,
      context: { taskId },
      taskId,
      model: 'gpt-4',
    });

    return aiTaskSuggestion;
  }

  // Chat Assistant
  async chatAssistant(userId: string, message: string, context?: any) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user context
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
        tasks: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const contextInfo = `
User: ${user.name}
Teams: ${user.teams.map(t => t.team.name).join(', ')}
Recent Tasks: ${user.tasks.map(t => t.title).join(', ')}
`;

    const aiResponse = await this.callAI({
      systemPrompt: `You are a helpful assistant for a team collaboration platform. 
Help users with questions about their tasks, meetings, teams, and projects.
Be concise and actionable.`,
      userPrompt: `${contextInfo}\n\nUser Question: ${message}`,
    });

    // Parse response (might be JSON or plain text)
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch {
      parsedResponse = { response: aiResponse };
    }

    const finalResponse = parsedResponse.response || aiResponse;
    const suggestions = parsedResponse.suggestions || this.generateSuggestions(message, user);

    await this.createAIInteraction({
      type: 'chat',
      prompt: message,
      response: finalResponse,
      context: context,
      userId,
      model: this.openaiApiKey ? 'gpt-4o-mini' : 'mock',
    });

    return {
      response: finalResponse,
      suggestions,
    };
  }

  // Document Generation
  async generateDocument(type: string, context: any, userId: string) {
    const prompt = this.getDocumentPrompt(type, context);

    const content = await this.callAI({
      systemPrompt: `You are a document generation assistant. Create professional ${type} documents.`,
      userPrompt: prompt,
    });

    await this.createAIInteraction({
      type: 'document_generation',
      prompt: prompt,
      response: content,
      context: context,
      userId,
      model: 'gpt-4',
    });

    return { content, type };
  }

  // Helper: Call AI
  private async callAI(params: { systemPrompt: string; userPrompt: string }): Promise<string> {
    // Try to use OpenAI if API key is available
    if (this.openaiApiKey) {
      try {
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: this.openaiApiKey });
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // Use cheaper model
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: params.userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });
        
        return completion.choices[0]?.message?.content || 'No response from AI';
      } catch (error) {
        console.error('OpenAI API error:', error);
        // Fall back to smart mock
      }
    }

    // Smart mock response based on prompt
    const userPrompt = params.userPrompt.toLowerCase();
    
    // Task-related queries
    if (userPrompt.includes('task')) {
      return JSON.stringify({
        response: 'I can help you with tasks! Here are some suggestions:\n\n1. View all your tasks\n2. Create a new task\n3. Update task status\n4. Assign tasks to team members\n\nWould you like me to show you your current tasks?',
        suggestions: ['View tasks', 'Create task', 'Task analytics'],
      });
    }

    // Meeting-related queries
    if (userPrompt.includes('meeting')) {
      return JSON.stringify({
        response: 'I can help you with meetings! Here\'s what I can do:\n\n1. Schedule a meeting\n2. Generate meeting summaries\n3. Extract action items\n4. View upcoming meetings\n\nWould you like me to show your upcoming meetings?',
        suggestions: ['Schedule meeting', 'View meetings', 'Meeting summary'],
      });
    }

    // Team-related queries
    if (userPrompt.includes('team')) {
      return JSON.stringify({
        response: 'I can help you with team management! Here\'s what I can do:\n\n1. View team members\n2. Check team activity\n3. View team analytics\n4. Manage team permissions\n\nWould you like to see your team members?',
        suggestions: ['View team', 'Team analytics', 'Team activity'],
      });
    }

    // Code-related queries
    if (userPrompt.includes('code') || userPrompt.includes('repository') || userPrompt.includes('pr')) {
      return JSON.stringify({
        response: 'I can help you with code and repositories! Here\'s what I can do:\n\n1. Review code changes\n2. Explain code\n3. Suggest improvements\n4. View pull requests\n\nWould you like me to review a specific PR?',
        suggestions: ['View repositories', 'Code review', 'Pull requests'],
      });
    }

    // Default helpful response
    return JSON.stringify({
      response: `I'm your AI assistant for Team Connect Hub! I can help you with:\n\n• Tasks and project management\n• Meeting summaries and scheduling\n• Team collaboration\n• Code reviews and repositories\n• Analytics and insights\n\nWhat would you like help with today?`,
      suggestions: ['View dashboard', 'Check tasks', 'Schedule meeting'],
    });
  }

  private getDocumentPrompt(type: string, context: any): string {
    switch (type) {
      case 'meeting_minutes':
        return `Generate meeting minutes for: ${context.title}`;
      case 'project_proposal':
        return `Generate project proposal based on: ${JSON.stringify(context)}`;
      default:
        return `Generate ${type} document`;
    }
  }

  private generateSuggestions(message: string, user: any): string[] {
    // Simple keyword-based suggestions
    const suggestions: string[] = [];
    
    if (message.toLowerCase().includes('task')) {
      suggestions.push('View all tasks', 'Create new task');
    }
    if (message.toLowerCase().includes('meeting')) {
      suggestions.push('Schedule meeting', 'View upcoming meetings');
    }
    if (message.toLowerCase().includes('team')) {
      suggestions.push('View team members', 'Team analytics');
    }

    return suggestions;
  }

  // Get AI interactions history
  async getAIHistory(userId?: string, type?: string) {
    return this.prisma.aIInteraction.findMany({
      where: {
        userId: userId || undefined,
        type: type || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // Get AI summary
  async getAISummary(relatedId: string, relatedType: string) {
    return this.prisma.aISummary.findFirst({
      where: {
        relatedId,
        relatedType,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
