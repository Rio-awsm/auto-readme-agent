import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GitHubRepository, RepositoryDetails } from '../types/github';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async generateReadme(repoDetails: RepositoryDetails | GitHubRepository, existingReadme?: string) {
    const isEnrichedDetails = 'languages' in repoDetails;
    const technologies = isEnrichedDetails ? this.extractTechnologies(repoDetails as RepositoryDetails) : null;
    
    let languages = repoDetails.language || 'Not specified';
    if (isEnrichedDetails && (repoDetails as RepositoryDetails).languages) {
      languages = Object.entries((repoDetails as RepositoryDetails).languages)
        .map(([lang, stats]) => `${lang} (${stats.percentage}%)`)
        .join(', ');
    }
    
    let contributors = '';
    if (isEnrichedDetails && (repoDetails as RepositoryDetails).contributors) {
      contributors = (repoDetails as RepositoryDetails).contributors
        .map(c => c.login)
        .join(', ');
    }
    
    let releases = '';
    if (isEnrichedDetails && (repoDetails as RepositoryDetails).releases) {
      releases = (repoDetails as RepositoryDetails).releases
        .map(r => `${r.tag_name} (${new Date(r.published_at).toLocaleDateString()})`)
        .join(', ');
    }
    
    const projectType = this.determineProjectType(repoDetails);
    const topics = Array.isArray(repoDetails.topics) && repoDetails.topics.length > 0 
      ? repoDetails.topics.join(', ') 
      : '';

    // Fix for TS2531 error - ensure license exists and has name before accessing
    const licenseInfo = isEnrichedDetails && 
                       repoDetails.license && 
                       repoDetails.license.name 
                       ? `- License: ${repoDetails.license.name}` 
                       : '';

    const prompt = `Create a modern, comprehensive, and professional README.md for a GitHub repository with these details:

REPOSITORY DETAILS:
- Name: ${repoDetails.name}
- Description: ${repoDetails.description || 'No description provided'}
- Primary Language: ${repoDetails.language || 'Not specified'}
${isEnrichedDetails ? `- All Languages: ${languages}` : ''}
- Created: ${new Date(repoDetails.created_at).toLocaleDateString()}
- Last Updated: ${new Date(repoDetails.updated_at).toLocaleDateString()}
- Stars: ${repoDetails.stargazers_count || 0}
- Forks: ${repoDetails.forks_count || 0}
- Open Issues: ${repoDetails.open_issues_count || 0}
${repoDetails.homepage ? `- Homepage/Demo: ${repoDetails.homepage}` : ''}
${topics ? `- Topics/Tags: ${topics}` : ''}
${technologies ? `- Technologies/Dependencies: ${technologies}` : ''}
${contributors ? `- Contributors: ${contributors}` : ''}
${releases ? `- Recent Releases: ${releases}` : ''}
${licenseInfo}
- Project Type: ${projectType}
${existingReadme ? '\nEXISTING README TO IMPROVE:\n\n' + existingReadme : ''}

REQUIREMENTS:
1. Create a visually appealing README with proper Markdown formatting
2. Generate appropriate and functional shields.io badges for:
   - Build status (based on project type)
   - Version/releases
   - License
   - Language usage
   - Dependencies status
3. Structure the content logically with clear section headers
4. Ensure all code examples are properly formatted in code blocks with language syntax highlighting that matches the repository's primary language
5. Use tables, bullet points, and other formatting to improve readability
6. Include high-quality sample code that matches the repository's purpose
7. Reflect the true purpose and usage of the repository based on the details provided

MUST INCLUDE:
- Eye-catching title with an emoji appropriate for the repository type
- Concise project description (1-2 sentences)
- Visual project banner or logo (suggest using a simple ASCII art or emoji header if no logo exists)
- Key features (bullet points)
- Prerequisites and dependencies
- Installation instructions with step-by-step commands
- Usage examples with real-world code snippets
- API documentation (if applicable)
- Configuration options
- Testing instructions
- Deployment guidelines (if applicable)
- How to contribute section
- License information
- Credits/Acknowledgments

SPECIFIC FOR PROJECT TYPE "${projectType}":
${this.getProjectTypeInstructions(projectType)}

EXCLUDE:
- Placeholder text or lorem ipsum
- Redundant information
- Excessive comments
- Any content not directly relevant to the repository's purpose
- Mention of this AI tool generating the README

Format the entire response in clean, modern Markdown syntax only. The README should be complete and ready to be committed to the repository without further editing.`;

    try {
      const result = await this.model.generateContent(prompt);
      const generatedReadme = result.response.text();
      const cleanedReadme = this.cleanupReadme(generatedReadme, repoDetails.name);
      return cleanedReadme;
    } catch (error) {
      console.error("Error generating README:", error);
      throw new Error("Failed to generate README content");
    }
  }

  private extractTechnologies(repoDetails: RepositoryDetails): string | null {
    if (!repoDetails.packageJson?.content) {
      return null;
    }
    
    try {
      const packageData = JSON.parse(repoDetails.packageJson.content);
      const dependencies = { 
        ...(packageData.dependencies || {}), 
        ...(packageData.devDependencies || {}) 
      };
      
      return Object.keys(dependencies).join(', ');
    } catch (e) {
      console.error("Error parsing package.json:", e);
      return null;
    }
  }

  private determineProjectType(repo: GitHubRepository | RepositoryDetails): string {
    const topics = repo.topics || [];
    const name = repo.name.toLowerCase();
    const description = (repo.description || '').toLowerCase();
    const language = repo.language || '';
    
    if (
      topics.some(t => ['api', 'backend', 'server', 'database', 'rest-api', 'graphql'].includes(t)) ||
      name.includes('api') || 
      name.includes('server') ||
      description.includes('api') ||
      description.includes('backend')
    ) {
      return 'Backend/API';
    }
    
    if (
      topics.some(t => ['frontend', 'ui', 'react', 'vue', 'angular', 'svelte', 'website'].includes(t)) ||
      language === 'JavaScript' || 
      language === 'TypeScript' ||
      name.includes('ui') ||
      name.includes('app') ||
      description.includes('frontend') ||
      description.includes('interface')
    ) {
      return 'Frontend/UI';
    }
    
    if (
      topics.some(t => ['library', 'framework', 'package', 'sdk', 'toolkit'].includes(t)) ||
      name.includes('lib') ||
      name.includes('sdk') ||
      description.includes('library')
    ) {
      return 'Library/Package';
    }
    
    if (
      topics.some(t => ['cli', 'command-line', 'terminal', 'tool'].includes(t)) ||
      name.includes('cli') ||
      name.includes('tool') ||
      description.includes('command line') ||
      description.includes('cli')
    ) {
      return 'CLI/Tool';
    }
    
    if (
      topics.some(t => ['data-science', 'machine-learning', 'ai', 'ml', 'analytics'].includes(t)) ||
      language === 'Python' ||
      language === 'R' ||
      name.includes('ml') ||
      name.includes('ai') ||
      description.includes('machine learning') ||
      description.includes('data')
    ) {
      return 'Data Science';
    }
    
    return 'Generic';
  }

  private getProjectTypeInstructions(projectType: string): string {
    switch (projectType) {
      case 'Frontend/UI':
        return `- Include screenshots or GIFs of the UI if possible
- Focus on UI/UX features and components
- Add browser compatibility information
- Include styling and theming instructions
- Add responsive design information`;
      
      case 'Backend/API':
        return `- Include detailed API endpoint documentation with request/response examples
- Add database schema information or ERD if applicable
- Focus on performance considerations
- Include authentication/authorization details
- Add server requirements and deployment options`;
      
      case 'Library/Package':
        return `- Focus on detailed API documentation with types
- Include installation methods (npm, yarn, pip, etc.)
- Add import/require examples
- Show common usage patterns and edge cases
- Include versioning information`;
      
      case 'CLI/Tool':
        return `- Focus on command-line usage with all available options
- Use ASCII art for command examples
- Include configuration file formats
- Show example outputs
- Add installation methods for different platforms`;
      
      case 'Data Science':
        return `- Focus on datasets used and data processing steps
- Include model architecture descriptions
- Add results visualization examples
- Include reproducibility instructions
- Add performance metrics and benchmarks`;
      
      default:
        return `- Focus on the core functionality and use cases
- Include detailed setup instructions
- Add examples that demonstrate the primary purpose
- Include troubleshooting tips`;
    }
  }

  private cleanupReadme(readme: string, repoName: string): string {
    let cleanedReadme = readme
      .replace(/!\[.*logo.*\]\(.*\)/i, `# ${repoName}`)
      .replace(/github\.com\/username\//, 'github.com/')
      .replace(/img\.shields\.io\/badge\/([^-]*)-([^-]*)-([^)]*)/g, 'img.shields.io/badge/$1-$2-blue')
      .replace(/img\.shields\.io\/badge\/build-passing-blue/g, 'img.shields.io/badge/build-passing-brightgreen')
      .replace(/img\.shields\.io\/badge\/version-([^-]*)-blue/g, 'img.shields.io/badge/version-$1-informational')
      .replace(/img\.shields\.io\/badge\/license-([^-]*)-blue/g, 'img.shields.io/badge/license-$1-yellow')
      .replace(/img\.shields\.io\/badge\/dependencies-([^-]*)-blue/g, 'img.shields.io/badge/dependencies-$1-brightgreen');
    
    // Fix TS6133: unused 'match' parameter
    cleanedReadme = cleanedReadme.replace(/```(\w+)\s*\n([\s\S]*?)```/gm, (_, language, code) => {
      return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    });
    
    // Fix TS6133: unused 'match' parameter
    cleanedReadme = cleanedReadme.replace(/\|\s*([\w\s-]+)\s*\|\s*([\w\s-]+)\s*\|\s*([\w\s-\.]+)\s*\|/gm, (_, col1, col2, col3) => {
      return `| ${col1.trim()} | ${col2.trim()} | ${col3.trim()} |`;
    });
    
    // Fix TS6133: unused 'match' parameter
    cleanedReadme = cleanedReadme.replace(/(\|\s*[\w\s-]+\s*\|\s*[\w\s-]+\s*\|\s*[\w\s-\.]+\s*\|\n)(?!\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*[-:]+\s*\|)/gm, 
      (_, headerRow) => {
        return `${headerRow}| --- | --- | --- |\n`;
    });
    
    cleanedReadme = cleanedReadme.replace(/(\n#{1,3} .*\n)(?!\n)/g, '$1\n');
    cleanedReadme = cleanedReadme.replace(/(\*   )/g, '* ');
    cleanedReadme = cleanedReadme.replace(/(\d+\.\s{3})/g, '$1 ');
    cleanedReadme = cleanedReadme.replace(/([^\n])(```)/g, '$1\n\n$2');
    cleanedReadme = cleanedReadme.replace(/(```[^`]*)([^\n])/g, '$1\n\n$2');
    
    return cleanedReadme;
  }
}