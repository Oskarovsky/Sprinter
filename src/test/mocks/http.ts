import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const handlers = [
  // Mock OpenRouter
  http.post('https://openrouter.ai/api/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: 'Mocked AI response',
          },
        },
      ],
    });
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
