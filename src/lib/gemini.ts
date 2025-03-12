import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GitHubRepository } from '../types/github';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async generateReadme(repoDetails: GitHubRepository, existingReadme?: string) {
    const prompt = `Create a modern, comprehensive README.md for a GitHub repository with these details:

Repository: ${repoDetails.name}
Description: ${repoDetails.description || 'No description provided'}
Primary Language: ${repoDetails.language || 'Not specified'}
Created: ${new Date(repoDetails.created_at).toLocaleDateString()}
${repoDetails.homepage ? `Homepage/Demo: ${repoDetails.homepage}` : ''}
${Array.isArray(repoDetails.topics) && repoDetails.topics.length > 0 ? `Topics/Tags: ${repoDetails.topics.join(', ')}` : ''}
${existingReadme ? 'EXISTING README TO IMPROVE:\n\n' + existingReadme : ''}

REQUIREMENTS:
1. Create a visually appealing README with proper Markdown formatting
2. Include badges for build status, version, license etc. where appropriate
3. Structure the content logically with clear section headers
4. Ensure all code examples are properly formatted in code blocks with language syntax highlighting
5. Use tables, bullet points, and other formatting to improve readability

MUST INCLUDE:
- Eye-catching title with logo/icon if possible
- Concise project description (1-2 sentences)
- Key features (bullet points)
- Prerequisites
- Installation instructions with step-by-step commands
- Usage examples with code snippets
- API documentation (if applicable)
- Configuration options
- How to contribute
- License information
- Credits/Acknowledgments

EXCLUDE:
- Placeholder text or lorem ipsum
- Redundant information
- Excessive comments
- Any content not directly relevant to the repository's purpose

Format the entire response in clean, modern Markdown syntax only.`;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}