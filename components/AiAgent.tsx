import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import TextareaAutosize from "react-textarea-autosize";
import { Bot, X, Send, Loader2, Minus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useUser } from "../contexts/UserContext";

type Message = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
};

export const AiAgent: React.FC = () => {
  const { effectiveRole } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your AI Assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const hasDragged = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('.no-drag')) return;
    setIsDragging(true);
    hasDragged.current = false;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
      startX: e.clientX,
      startY: e.clientY
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    // Prevent accidental drags from tiny physical clicks (jitter)
    const dx = Math.abs(e.clientX - dragStartRef.current.startX);
    const dy = Math.abs(e.clientY - dragStartRef.current.startY);
    if (dx > 3 || dy > 3) {
      hasDragged.current = true;
    }

    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isLoading) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isLoading]);

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => !prev);
      setIsMinimized(false);
    };
    window.addEventListener("toggle-ai-agent", handleToggle);
    return () => window.removeEventListener("toggle-ai-agent", handleToggle);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("API Key is missing. Please restart your dev server.");
      }

      let apiMessages: any[] = newMessages.map((m) => {
        if (m.role === "system") return m;
        // Exclude tool messages from history for simplicity unless we properly maintain tool_calls
        return { role: m.role, content: m.content };
      });

      apiMessages.unshift({
        role: "system",
        content:
          "You are an AI assistant for a project management system. STRICT GUARDRAILS: 1. NEVER hallucinate, guess, or invent project IDs, titles, names, or any data. 2. ONLY use the exact data returned by your tool calls. 3. If a tool returns an empty list or missing data, explicitly state that the data is missing; DO NOT generate placeholder examples like 'Project 1'. 4. If a project is not found, state it clearly without inventing reasons. Be concise. Format responses using Markdown (bold text, bullet points, headings) for readability.",
      });

      const tools = [
        {
          type: "function",
          function: {
            name: "getProjectDetails",
            description: "Get the details of a project using its ID",
            parameters: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "The ID of the project",
                },
              },
              required: ["projectId"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "updateProjectStatus",
            description: "Update the status of a project.",
            parameters: {
              type: "object",
              properties: {
                projectId: { type: "string" },
                newStatus: { type: "string" },
              },
              required: ["projectId", "newStatus"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "getProjectsSummary",
            description: "Get a count of projects based on their exact status",
            parameters: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  description:
                    "The EXACT status. Valid values: 'In Progress', 'Revision', 'Revision Urgent', 'Urgent', 'QA Review', 'Final Files', 'Sent For Approval', 'Cancelled', 'Done', 'Revision Done', 'Revision Urgent Done', 'Urgent Done', 'Final Files Done', 'Approved'.",
                },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "getLateProjectsSummary",
            description:
              "Check how many projects are currently late. Returns counts of active projects where the assignee deadline is missed, and where the client deadline is missed. Also returns lists of full project details (including assignee, status, etc) that are late.",
            parameters: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  description: "Optional. Check late projects only for this exact status (e.g. 'Sent For Approval', 'In Progress', 'Done', etc.)"
                }
              },
            },
          },
        },
      ];

      let currentMessages = [...apiMessages];
      let maxSteps = 5;
      let finalResponseText = "";

      while (maxSteps > 0) {
        maxSteps--;
        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini",
              messages: currentMessages,
              tools: tools,
              tool_choice: "auto",
            }),
          },
        );

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const choice = data.choices[0];
        const message = choice.message;

        currentMessages.push(message);

        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const toolCall of message.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments);
            let result;

            if (toolCall.function.name === "getProjectDetails") {
              const cleanId = args.projectId.trim();
              // Use ilike to match either project_id or project_title safely (avoids UUID cast errors on 'id' column)
              const { data: projects, error: pError } = await supabase
                .from("projects")
                .select("id, project_id, project_title, client_name, assignee, due_date, due_time, client_due_date, client_due_time, status, qa_status, price")
                .or(`project_id.ilike.%${cleanId}%,project_title.ilike.%${cleanId}%`)
                .limit(1);
              
              const project = projects?.[0];
              
              if (pError || !project) {
                 result = { error: `Project not found for search term: ${cleanId}` };
              } else {
                 const { data: comments } = await supabase
                    .from("project_comments")
                    .select("content, author_name, created_at, is_internal, category")
                    .eq("project_id", project.project_id)
                    .order("created_at", { ascending: false })
                    .limit(20);
                 
                 project.recent_comments_and_updates = comments || [];
                 result = { project };
              }
            } else if (toolCall.function.name === "updateProjectStatus") {
              const cleanId = args.projectId.trim();
              const { data, error } = await supabase
                .from("projects")
                .update({ status: args.newStatus })
                .eq("project_id", cleanId)
                .select("project_id, project_title, status")
                .single();
              result = error
                ? { error: error.message }
                : { success: true, project: data };
            } else if (toolCall.function.name === "getProjectsSummary") {
              const targetStatus = args.status;
              const { data, error } = await supabase.rpc(
                "get_project_status_counts",
              );

              if (error) {
                result = { error: error.message };
              } else if (data) {
                let count = 0;
                if (!targetStatus || targetStatus === "All") {
                  count = data.all || 0;
                } else if (targetStatus.toLowerCase().includes("qa")) {
                  count = data.qa_pending || 0;
                } else {
                  count = data[targetStatus.toLowerCase()] || 0;
                }
                result = { count, status: targetStatus || "All" };
              }
            } else if (toolCall.function.name === "getLateProjectsSummary") {
              const targetStatus = args.status;
              const { data: shallowData, error } = await supabase
                .from("projects")
                .select("project_id, due_date, due_time, client_due_date, client_due_time, status")
                .neq("status", "Removed");

              if (error) {
                result = { error: error.message };
              } else if (shallowData) {
                const activeData = shallowData.filter((p) => {
                  if (targetStatus) {
                    return p.status.toLowerCase() === targetStatus.toLowerCase();
                  }
                  const activeStatuses = [
                    "In Progress",
                    "Revision",
                    "Revision Urgent",
                    "Urgent",
                    "Final Files",
                  ];
                  return activeStatuses.includes(p.status);
                });

                const now = new Date();
                let assigneeLateCount = 0;
                let clientLateCount = 0;
                const assigneeLateIds: string[] = [];
                const clientLateIds: string[] = [];

                activeData.forEach((p) => {
                  if (p.due_date) {
                    const dt = new Date(`${p.due_date}T${p.due_time || "00:00:00"}`);
                    if (dt < now) {
                      assigneeLateCount++;
                      assigneeLateIds.push(p.project_id);
                    }
                  }
                  if (p.client_due_date) {
                    const dt = new Date(`${p.client_due_date}T${p.client_due_time || "00:00:00"}`);
                    if (dt < now) {
                      clientLateCount++;
                      clientLateIds.push(p.project_id);
                    }
                  }
                });

                const uniqueLateIds = [...new Set([...assigneeLateIds, ...clientLateIds])];
                let assigneeLateProjects: any[] = [];
                let clientLateProjects: any[] = [];

                if (uniqueLateIds.length > 0) {
                  const { data: fullProjects } = await supabase
                    .from("projects")
                    .select("id, project_id, project_title, client_name, assignee, due_date, due_time, client_due_date, client_due_time, status, qa_status, price")
                    .in("project_id", uniqueLateIds);

                  if (fullProjects) {
                    assigneeLateProjects = fullProjects.filter(p => assigneeLateIds.includes(p.project_id));
                    clientLateProjects = fullProjects.filter(p => clientLateIds.includes(p.project_id));
                  }

                  const { data: comments } = await supabase
                    .from("project_comments")
                    .select("project_id, content, author_name, created_at, is_internal, category")
                    .in("project_id", uniqueLateIds)
                    .order("created_at", { ascending: false });

                  assigneeLateProjects.forEach((p) => {
                    p.recent_comments = comments?.filter((c) => c.project_id === p.project_id).slice(0, 5) || [];
                  });
                  clientLateProjects.forEach((p) => {
                    p.recent_comments = comments?.filter((c) => c.project_id === p.project_id).slice(0, 5) || [];
                  });
                }

                result = {
                  system_instruction: `Start your response exactly with this sentence: "There are currently ${assigneeLateCount} late projects. Out of these, ${clientLateCount} projects are also late for the client." Then, list the actual project_id and project_title for each project under two clear headings. DO NOT use generic placeholders like 'Project 1'. You MUST use the real data from the assigneeLateProjects and clientLateProjects arrays.`,
                  assigneeLateProjects,
                  clientLateProjects,
                };
              }
            }

            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(result).replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, "[IMAGE_REMOVED_TO_SAVE_TOKENS]"),
            });
          }
        } else {
          finalResponseText = message.content;
          break;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            finalResponseText || "Sorry, I couldn't generate a response.",
        },
      ]);
    } catch (error: any) {
      console.error("AI Error Object:", error);
      const errorMessage =
        error?.message ||
        "Sorry, I encountered an error. Please check your API key or connection.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMessage}` },
      ]);
    } finally {
      setIsLoading(false);
      // The useEffect will handle auto-focus once isLoading becomes false
    }
  };

  // Only render for Super Admin and Project Manager
  if (effectiveRole !== "Super Admin" && effectiveRole !== "Project Manager") return null;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 select-none"
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, touchAction: isDragging ? "none" : "auto" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className={`bg-surface-bg border border-white/10 rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right ${isMinimized ? 'h-[62px]' : ''}`}>
          {/* Header */}
          <div 
            className={`bg-white/5 p-4 border-b border-white/10 flex justify-between items-center cursor-move ${isMinimized ? 'hover:bg-white/10' : ''}`}
            onClick={(e) => {
              if (hasDragged.current) { e.stopPropagation(); return; }
              isMinimized && setIsMinimized(false)
            }}
          >
            <div className="flex items-center gap-2 text-white font-medium">
              <Bot className="w-5 h-5 text-brand-primary" />
              AI Assistant
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[400px] flex flex-col gap-3 no-drag select-text">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-brand-primary text-white rounded-tr-sm"
                      : "bg-white/10 text-gray-200 rounded-tl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="font-bold text-base mb-1 mt-2 text-brand-primary" {...props} />,
                        h4: ({ node, ...props }) => <h4 className="font-bold text-sm mb-1 mt-2 text-brand-primary" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 p-3 rounded-2xl rounded-tl-sm text-brand-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-white/10 bg-white/5 no-drag">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <TextareaAutosize
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask me something..."
                maxRows={5}
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-brand-primary transition-colors resize-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-brand-primary text-white p-2 rounded-xl hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
          </>
          )}
        </div>
    </div>
  );
};
