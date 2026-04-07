import type { JSONContent } from "@tiptap/core";

import type { EditorTemplate, StoredDocument } from "@/lib/editor/types";

function cloneContent(content: JSONContent): JSONContent {
  return JSON.parse(JSON.stringify(content)) as JSONContent;
}

const blankDocument: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Press / to insert a table, checklist, callout, quote, or code block.",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This editor autosaves locally and can export your document as Markdown, PDF, and DOCX.",
        },
      ],
    },
  ],
};

const proposalTemplate: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Executive Summary" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Summarize the opportunity, desired outcome, and the headline decision that this document supports.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Scope" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Problem to solve" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Audience and constraints" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Success metrics" }] }],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Timeline" }],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Milestone" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Owner" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Date" }] }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Draft complete" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Team lead" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "MM/DD" }] }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Review round" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Stakeholders" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "MM/DD" }] }] },
          ],
        },
      ],
    },
  ],
};

const meetingNotesTemplate: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Attendees: " }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Agenda" }],
    },
    {
      type: "orderedList",
      attrs: { start: 1 },
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Opening context" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Key decisions" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Risks and blockers" }] }],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Action Items" }],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Confirm next milestone date" }] }],
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Send notes and owners" }] }],
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Capture the most important quote or commitment from the session here." }],
        },
      ],
    },
  ],
};

const launchBriefTemplate: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Launch Brief" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Use this brief to align the story, rollout plan, and success criteria." }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Core Message" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "What should people understand in a single sentence?" }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Readiness Checklist" }],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Messaging signed off" }] }],
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Landing page QA complete" }] }],
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Support team briefed" }] }],
        },
      ],
    },
  ],
};

export const editorTemplates: EditorTemplate[] = [
  {
    id: "blank",
    name: "Blank Document",
    title: "Untitled Document",
    summary: "Start clean with a light writing prompt.",
    description: "A minimal writing surface with a couple of starter cues.",
    content: blankDocument,
  },
  {
    id: "proposal",
    name: "Project Proposal",
    title: "Project Proposal",
    summary: "Structured sections for summary, scope, and timeline.",
    description: "Great for drafting a pitch, plan, or internal proposal.",
    content: proposalTemplate,
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    title: "Meeting Notes",
    summary: "Agenda, action items, and a space for key quotes.",
    description: "Keeps notes focused and easy to share after the meeting.",
    content: meetingNotesTemplate,
  },
  {
    id: "launch-brief",
    name: "Launch Brief",
    title: "Launch Brief",
    summary: "A crisp template for shipping a release or campaign.",
    description: "Use it for messaging, checklist tracking, and rollout planning.",
    content: launchBriefTemplate,
  },
];

export function getTemplateById(templateId: string): EditorTemplate {
  return editorTemplates.find((template) => template.id === templateId) ?? editorTemplates[0];
}

export function createStoredDocument(templateId = "blank"): StoredDocument {
  const template = getTemplateById(templateId);

  return {
    title: template.title,
    content: cloneContent(template.content),
    templateId: template.id,
    updatedAt: new Date().toISOString(),
  };
}

export function cloneTemplateContent(templateId: string): JSONContent {
  return cloneContent(getTemplateById(templateId).content);
}
