import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const handlers = [
  // Mock OpenRouter
  http.post('https://openrouter.ai/api/v1/chat/completions', async ({ request }) => {
    const body = await request.json();
    const userMessage = body.messages.find(m => m.role === 'user');

    if (userMessage.content.includes('File snippets:')) {
      // Analyst prompt
      return HttpResponse.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                storyPoints: 5,
                rationale: 'Mocked AI analyst rationale',
              }),
            },
          },
        ],
      });
    } else if (userMessage.content.includes('Task title:')) {
      // Coach prompt
      return HttpResponse.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'Mocked AI coach summary',
                questions: ['Question 1?', 'Question 2?', 'Question 3?'],
              }),
            },
          },
        ],
      });
    } else {
      // Draft prompt
      return HttpResponse.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                drafts: [
                  {
                    title: 'Mocked AI draft title',
                    description: 'Mocked AI draft description',
                    acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
                    openQuestions: ['Question 1', 'Question 2'],
                  },
                ],
              }),
            },
          },
        ],
      });
    }
  }),
  // Mock GitHub
  http.get('https://api.github.com/repos/:owner/:repo', () => {
    return HttpResponse.json({
      full_name: 'mocked/repo',
    });
  }),
  // Mock GitLab
  http.get('https://gitlab.com/api/v4/projects/:id', () => {
    return HttpResponse.json({
      name: 'mocked-repo',
    });
  }),
];

export const server = setupServer(...handlers);
