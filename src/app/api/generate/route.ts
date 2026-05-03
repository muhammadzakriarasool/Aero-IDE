import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert frontend developer building web applications.
Your task is to generate the code for a specific feature requested by the user.

CRITICAL: You must only output code mapped to a Vite + React environment. Do not use Next.js.
CRITICAL: You must return a raw, parsable JSON object. Do NOT wrap it in markdown blockticks like \\\`\\\`\\\`json. The response should start with { and end with }.
CRITICAL: You MUST use Tailwind CSS v4 for styling. You are strictly FORBIDDEN from generating tailwind.config.js, postcss.config.js, or using old @tailwind directives. Use the @tailwindcss/vite plugin and @import "tailwindcss" pattern.

The JSON object MUST perfectly match the WebContainer FileSystemTree structure.
Example structure:
{
  "src": {
    "directory": {
      "App.tsx": {
        "file": {
          "contents": "import React from 'react';\\n\\nexport default function App() {\\n  return <div className=\\"text-blue-500\\">Hello</div>;\\n}\\n"
        }
      },
      "main.tsx": {
        "file": {
          "contents": "import React from 'react';\\nimport ReactDOM from 'react-dom/client';\\nimport App from './App';\\nimport './index.css';\\n\\nReactDOM.createRoot(document.getElementById('root')!).render(<App />);\\n"
        }
      },
      "index.css": {
        "file": {
          "contents": "@import \\"tailwindcss\\";\\n"
        }
      }
    }
  },
  "package.json": {
    "file": {
      "contents": "{\\n  \\"name\\": \\"vite-react-app\\",\\n  \\"dependencies\\": {\\n    \\"react\\": \\"^19.0.0\\",\\n    \\"react-dom\\": \\"^19.0.0\\"\\n  },\\n  \\"devDependencies\\": {\\n    \\"@vitejs/plugin-react\\": \\"^4.3.4\\",\\n    \\"tailwindcss\\": \\"^4.0.0\\",\\n    \\"@tailwindcss/vite\\": \\"^4.0.0\\",\\n    \\"vite\\": \\"^6.0.5\\"\\n  },\\n  \\"scripts\\": {\\n    \\"dev\\": \\"vite\\"\\n  }\\n}\\n"
    }
  },
  "index.html": {
    "file": {
      "contents": "<!DOCTYPE html>\\n<html lang=\\"en\\">\\n  <body>\\n    <div id=\\"root\\"></div>\\n    <script type=\\"module\\" src=\\"/src/main.tsx\\"></script>\\n  </body>\\n</html>\\n"
    }
  },
  "vite.config.ts": {
    "file": {
      "contents": "import { defineConfig } from 'vite';\\nimport react from '@vitejs/plugin-react';\\nimport tailwindcss from '@tailwindcss/vite';\\n\\nexport default defineConfig({\\n  plugins: [react(), tailwindcss()]\\n});\\n"
    }
  }
}

You must ALWAYS include \`package.json\`, \`index.html\`, \`vite.config.ts\`, \`src/main.tsx\`, \`src/index.css\`, and \`src/App.tsx\` at minimum to ensure the Vite dev server can boot properly. Ensure you implement the feature directly in \`src/App.tsx\` or related components within \`src/\`. ALWAYS use Tailwind CSS classes for styling.
`;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt provided.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY environment variable is not set.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No text returned from Gemini");
    }

    let parsedTree;
    try {
      parsedTree = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini output as JSON", responseText);
      return NextResponse.json({ error: 'Failed to generate valid JSON FileSystemTree.' }, { status: 500 });
    }

    return NextResponse.json({ files: parsedTree });

  } catch (error: any) {
    console.error('Gemini generation error:', error);
    
    // Check for rate limit or quota errors gracefully
    if (error?.status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    return NextResponse.json({ error: error?.message || 'An unexpected error occurred during generation.' }, { status: 500 });
  }
}
