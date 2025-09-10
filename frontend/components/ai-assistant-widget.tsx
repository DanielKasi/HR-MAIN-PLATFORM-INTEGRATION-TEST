"use client";
import {useState, useRef, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Menu, X, ArrowUp, Bot, Sparkles} from "lucide-react";
import {apiPost, apiGet} from "@/lib/apiRequest";

interface ChatMessage {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

interface ChatHistory {
  chat_id: string;
  title: string;
  messages: ChatMessage[];
}

interface UserChats {
  user_id: number;
  chats: ChatHistory[];
}

interface DisplayMessage {
  id: string;
  type: "user" | "assistant" | "status";
  content: string;
  timestamp: string;
  messageType?:
    | "processing_start"
    | "progress"
    | "final_response"
    | "error"
    | "connected"
    | "heartbeat";
}

interface SSEMessage {
  type: "processing_start" | "progress" | "final_response" | "error" | "connected" | "heartbeat";
  message?: string;
  answer?: string;
  domain?: string;
  timestamp: number;
  step?: number;
  total_steps?: number;
  session_id?: string;
  chat_id?: string; // Add chat_id to SSE message
  error?: string;
}

// Add interface for API response
interface ApiResponse {
  data: {
    session_id: string;
    chat_id?: string;
    message?: string;
  };
}

const suggestedQuestions = [
  "What's the salary distribution by department?",
  "Are attendance penalties enabled?",
  "Tell me about the payroll for this month..!",
];

const TypingIndicator = () => {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-md px-3 sm:px-4 py-3 sm:py-3.5 flex items-center space-x-2">
        <div className="flex space-x-1">
          <div
            className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"
            style={{animationDelay: "0ms", animationDuration: "1.4s"}}
          ></div>
          <div
            className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"
            style={{animationDelay: "200ms", animationDuration: "1.4s"}}
          ></div>
          <div
            className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"
            style={{animationDelay: "400ms", animationDuration: "1.4s"}}
          ></div>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 ml-2">AI is thinking...</p>
      </div>
    </div>
  );
};

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentProcessingMessage, setCurrentProcessingMessage] = useState<string>("");
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Load chat history when component mounts or when widget opens
  useEffect(() => {
    if (isOpen && chatHistory.length === 0) {
      loadChatHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await apiGet("/assistant/user-chats/");
      const userChats: UserChats = response.data;
      setChatHistory(userChats.chats || []);
    } catch (error) {
      console.error("Error loading chat history:", error);
      setChatHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const convertChatMessagesToDisplay = (chatMessages: ChatMessage[]): DisplayMessage[] => {
    return chatMessages.map((msg, index) => ({
      id: `${msg.timestamp}-${index}`,
      type: msg.role === "user" ? "user" : "assistant",
      content: msg.message,
      timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  };

  const initializeSSEConnection = (sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const baseURL = process.env.NEXT_PUBLIC_API_URL;
    const eventSource = new EventSource(`${baseURL}/assistant/sse/?session_id=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("SSE connection opened");
    };

    eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);
        handleSSEMessage(data);
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log("SSE connection closed");
        setIsLoading(false);
        setCurrentProcessingMessage("");
        setProcessingStep(0);
        setTotalSteps(0);
      }
    };
  };

  const handleSSEMessage = (data: SSEMessage) => {
    console.log("Received SSE message:", data);

    switch (data.type) {
      case "connected":
        console.log("SSE connected:", data.message);
        break;

      case "processing_start":
        setCurrentProcessingMessage(data.message || "Starting to process...");
        setProcessingStep(0);
        setTotalSteps(0);

        // Capture chat_id if provided in processing_start
        if (data.chat_id && !currentChatId) {
          console.log("New chat_id received:", data.chat_id);
          setCurrentChatId(data.chat_id);
        }
        break;

      case "progress":
        setCurrentProcessingMessage(data.message || "Processing...");
        if (data.step) setProcessingStep(data.step);
        if (data.total_steps) setTotalSteps(data.total_steps);

        // Capture chat_id if provided in progress
        if (data.chat_id && !currentChatId) {
          console.log("New chat_id received in progress:", data.chat_id);
          setCurrentChatId(data.chat_id);
        }
        break;

      case "final_response":
        setIsLoading(false);
        setCurrentProcessingMessage("");
        setProcessingStep(0);
        setTotalSteps(0);

        // Capture chat_id if provided in final response
        if (data.chat_id && !currentChatId) {
          console.log("New chat_id received in final response:", data.chat_id);
          setCurrentChatId(data.chat_id);
        }

        if (data.answer) {
          const assistantMessage: DisplayMessage = {
            id: Date.now().toString(),
            type: "assistant",
            content: data.answer,
            timestamp: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}),
            messageType: "final_response",
          };

          setMessages((prev) => [...prev, assistantMessage]);
          loadChatHistory();
        }

        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        break;

      case "error":
        setIsLoading(false);
        setCurrentProcessingMessage("");
        setProcessingStep(0);
        setTotalSteps(0);

        const errorMessage: DisplayMessage = {
          id: Date.now().toString(),
          type: "assistant",
          content: data.message || "An error occurred while processing your request.",
          timestamp: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}),
          messageType: "error",
        };

        setMessages((prev) => [...prev, errorMessage]);

        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        break;

      case "heartbeat":
        break;

      default:
        console.log("Unknown SSE message type:", data.type);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQuestion = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      initializeSSEConnection(sessionId);

      const payload: any = {
        question: currentQuestion,
        session_id: sessionId,
      };

      if (currentChatId) {
        payload.chat_id = currentChatId;
      }

      const response: ApiResponse = await apiPost(`/assistant/`, payload);

      // Capture chat_id from the initial API response if available
      if (response.data.chat_id && !currentChatId) {
        console.log("New chat_id received from API response:", response.data.chat_id);
        setCurrentChatId(response.data.chat_id);
      }

      console.log("Processing started:", response.data);
    } catch (error) {
      setIsLoading(false);
      setCurrentProcessingMessage("");
      setProcessingStep(0);
      setTotalSteps(0);

      let errorMessage = "Failed to start processing. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "detail" in error) {
        errorMessage = (error as any).detail;
      }

      const errorChatMessage: DisplayMessage = {
        id: Date.now().toString(),
        type: "assistant",
        content: errorMessage,
        timestamp: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}),
        messageType: "error",
      };

      setMessages((prev) => [...prev, errorChatMessage]);

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleHistoryClick = (chat: ChatHistory) => {
    setCurrentChatId(chat.chat_id);

    const displayMessages = convertChatMessagesToDisplay(chat.messages);
    setMessages(displayMessages);

    setShowHistory(false);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setShowHistory(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHistory && historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showHistory]);

  const formatChatTitle = (chat: ChatHistory) => {
    if (chat.title && chat.title !== "New Chat" && chat.title.trim()) {
      return chat.title;
    }

    const firstUserMessage = chat.messages.find((msg) => msg.role === "user");
    if (firstUserMessage) {
      return firstUserMessage.message.length > 40
        ? firstUserMessage.message.substring(0, 40) + "..."
        : firstUserMessage.message;
    }

    return "New Chat";
  };

  const formatChatDate = (chat: ChatHistory) => {
    if (chat.messages.length === 0) return "";

    const lastMessage = chat.messages[chat.messages.length - 1];
    const date = new Date(lastMessage.timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes typing-dots {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }
        .typing-dot-1 {
          animation: typing-dots 1.4s infinite ease-in-out;
          animation-delay: 0ms;
        }
        .typing-dot-2 {
          animation: typing-dots 1.4s infinite ease-in-out;
          animation-delay: 200ms;
        }
        .typing-dot-3 {
          animation: typing-dots 1.4s infinite ease-in-out;
          animation-delay: 400ms;
        }
      `}</style>

      <div className="fixed bottom-6 right-6 z-50">
        {showTooltip && !isOpen && (
          <div className="absolute bottom-16 right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg animate-in fade-in duration-200 whitespace-nowrap">
            AI Assistant
            <div className="absolute bottom-0 right-6 transform translate-y-full">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}

        {isOpen && (
          <div className="absolute bottom-16 right-0 mb-1">
            <div className="absolute bottom-0 right-6 transform translate-y-full z-20">
              <div className="w-0 h-0 border-l-[18px] border-r-[18px] border-t-[18px] border-l-transparent border-r-transparent border-t-white drop-shadow-2xl animate-in fade-in duration-300"></div>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-3 bg-gradient-to-b from-white to-transparent opacity-80"></div>
            </div>

            <Card
              ref={cardRef}
              className="shadow-2xl border-0 bg-white rounded-2xl overflow-hidden relative animate-in slide-in-from-bottom-4 zoom-in-95 duration-300"
            >
              <CardHeader className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-white relative z-20">
                <div className="flex items-center justify-between">
                  {!showHistory && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHistory(true)}
                      className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    >
                      <Menu className="h-4 w-4 text-gray-600" />
                    </Button>
                  )}
                  {showHistory && <div className="w-8 h-8" />}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      Peracosoft AI Assistant
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <X className="h-4 w-4 text-gray-600" />
                  </Button>
                </div>
              </CardHeader>

              <div className="relative w-[85vw] max-w-[320px] sm:w-96 sm:max-w-[calc(100vw-3rem)] h-[50vh] sm:h-[450px] max-h-[600px] overflow-hidden">
                {showHistory && (
                  <div ref={historyRef} className="absolute inset-0 z-40 flex">
                    <div className="bg-white w-[75%] h-full flex flex-col shadow-xl">
                      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                          Chat History
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowHistory(false)}
                          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        >
                          <X className="h-4 w-4 text-gray-600" />
                        </Button>
                      </div>

                      <div className="px-3 sm:px-6 py-3 border-b border-gray-100">
                        <Button
                          onClick={handleNewChat}
                          variant="outline"
                          className="w-full text-sm border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors duration-200"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          New Chat
                        </Button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                        <div className="space-y-3 sm:space-y-4">
                          {isLoadingHistory ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-3"></div>
                              <p className="text-sm text-gray-500">Loading chats...</p>
                            </div>
                          ) : chatHistory.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-sm text-gray-500">No chat history yet</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Start a conversation to see your chats here
                              </p>
                            </div>
                          ) : (
                            chatHistory.map((chat) => (
                              <div
                                key={chat.chat_id}
                                className={`cursor-pointer hover:bg-gray-50 p-3 sm:p-4 rounded-lg transition-colors duration-150 -mx-1 sm:-mx-2 border-l-2 ${
                                  currentChatId === chat.chat_id
                                    ? "border-red-500 bg-red-50"
                                    : "border-transparent"
                                }`}
                                onClick={() => handleHistoryClick(chat)}
                              >
                                <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2 leading-relaxed break-words">
                                  {formatChatTitle(chat)}
                                </p>
                                <div className="flex justify-between items-center">
                                  <p className="text-xs text-gray-500">
                                    {chat.messages.length} message
                                    {chat.messages.length !== 1 ? "s" : ""}
                                  </p>
                                  <p className="text-xs text-gray-400">{formatChatDate(chat)}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className="bg-black bg-opacity-30 w-[25%] h-full cursor-pointer"
                      onClick={() => setShowHistory(false)}
                    />
                  </div>
                )}

                <div className="w-full h-full flex flex-col relative">
                  <CardContent className="flex-1 flex flex-col p-0 relative min-h-0">
                    {messages.length === 0 ? (
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto">
                          <div className="flex flex-col items-center justify-center p-4 sm:p-6 min-h-full">
                            <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mb-4 sm:mb-6 border border-red-200">
                              <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center">
                                <Sparkles className="h-4 sm:h-5 w-4 sm:w-5 text-white animate-pulse" />
                              </div>
                            </div>
                            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3 text-center">
                              What Can I Help You With?
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 text-center mb-4 sm:mb-6 max-w-xs leading-relaxed px-2">
                              Ask me anything about your hr system from employee, attendance and
                              payroll reports to orders, business assets, and analytics.
                            </p>

                            <div className="w-full space-y-2 mb-3 sm:mb-4 px-2">
                              {suggestedQuestions.slice(0, 2).map((question, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  className="w-full text-left justify-start h-auto py-2 sm:py-2.5 px-2 sm:px-3 text-xs sm:text-sm border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg transition-colors duration-150 whitespace-normal break-words"
                                  onClick={() => handleSuggestedQuestion(question)}
                                >
                                  {question}
                                </Button>
                              ))}
                            </div>

                            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 px-2">
                              {suggestedQuestions.slice(2).map((question, index) => (
                                <Button
                                  key={index + 2}
                                  variant="outline"
                                  className="text-left justify-start h-auto py-2 sm:py-2.5 px-2 sm:px-2.5 text-xs border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg transition-colors duration-150 whitespace-normal break-words"
                                  onClick={() => handleSuggestedQuestion(question)}
                                >
                                  {question}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto">
                          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                            <div className="text-center mb-3 sm:mb-4">
                              <p className="text-xs text-gray-500">
                                {new Date().toLocaleDateString("en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                              {/* {currentChatId && (
                                <p className="text-xs text-red-600 mt-1">
                                  Continuing previous conversation
                                </p>
                              )} */}
                            </div>

                            {messages.map((message) => (
                              <div key={message.id} className="flex flex-col space-y-1">
                                {message.type === "user" ? (
                                  <div className="flex justify-end">
                                    <div
                                      className="bg-red-500 text-white rounded-2xl rounded-tr-md px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm transform transition-all duration-200 hover:shadow-md break-words hyphens-auto"
                                      style={{maxWidth: "85%"}}
                                    >
                                      <p className="text-xs sm:text-sm leading-relaxed break-words">
                                        {message.content}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-start">
                                    <div
                                      className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-md px-3 sm:px-4 py-2 sm:py-2.5 transform transition-all duration-200 hover:shadow-sm break-words hyphens-auto"
                                      style={{maxWidth: "85%"}}
                                    >
                                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                                        {message.content}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                <p
                                  className="text-xs text-gray-400 px-1"
                                  style={{textAlign: message.type === "user" ? "right" : "left"}}
                                >
                                  {message.timestamp}
                                </p>
                              </div>
                            ))}

                            {isLoading && <TypingIndicator />}

                            <div ref={messagesEndRef} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="shrink-0 p-3 sm:p-4 border-t border-gray-100 bg-white relative z-10">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <Input
                          ref={inputRef}
                          placeholder="Type your question here..."
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          disabled={isLoading}
                          className="flex-1 border-gray-200 focus:border-red-500 focus:ring-red-500 rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm placeholder:text-gray-400 transition-colors duration-200 overflow-hidden disabled:opacity-50"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim() || isLoading}
                          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-full shadow-sm transition-all duration-200 hover:shadow-md transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
                        >
                          {isLoading ? (
                            <div className="flex space-x-0.5">
                              <div className="w-1 h-1 bg-gray-400 rounded-full typing-dot-1"></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full typing-dot-2"></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full typing-dot-3"></div>
                            </div>
                          ) : (
                            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="flex flex-col items-end">
          {!isOpen ? (
            <Button
              onClick={() => setIsOpen(true)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="relative bg-gradient-to-br from-red-600 via-orange-700 to-red-700 hover:from-red-700 hover:via-orange-800 hover:to-red-800 text-white rounded-full h-14 w-14 p-0 shadow-xl transition-all duration-300 hover:shadow-2xl transform hover:scale-110 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-400 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>

              <div className="relative z-10 flex items-center justify-center">
                <div className="relative">
                  <Bot className="h-6 w-6 transform group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="h-2 w-2 text-white" />
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-300"></div>
            </Button>
          ) : (
            <Button
              onClick={() => setIsOpen(false)}
              className="bg-gradient-to-br from-red-600 to-orange-700 hover:from-orange-700 hover:to-red-800 text-white rounded-full h-14 w-14 p-0 shadow-xl transition-all duration-300 hover:shadow-2xl transform hover:scale-110"
            >
              <X className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
// "use client";
// import {useState, useRef, useEffect} from "react";
// import {Button} from "@/components/ui/button";
// import {Card, CardContent, CardHeader} from "@/components/ui/card";
// import {Input} from "@/components/ui/input";
// import {Menu, X, ArrowUp, Bot, Sparkles} from "lucide-react";
// import {apiPost, apiGet} from "@/lib/apiRequest";

// interface ChatMessage {
//   role: "user" | "assistant";
//   message: string;
//   timestamp: string;
// }

// interface ChatHistory {
//   chat_id: string;
//   title: string;
//   messages: ChatMessage[];
// }

// interface UserChats {
//   user_id: number;
//   chats: ChatHistory[];
// }

// interface DisplayMessage {
//   id: string;
//   type: "user" | "assistant" | "status";
//   content: string;
//   timestamp: string;
//   messageType?:
//     | "processing_start"
//     | "progress"
//     | "final_response"
//     | "error"
//     | "connected"
//     | "heartbeat";
// }

// interface SSEMessage {
//   type: "processing_start" | "progress" | "final_response" | "error" | "connected" | "heartbeat";
//   message?: string;
//   answer?: string;
//   domain?: string;
//   timestamp: number;
//   step?: number;
//   total_steps?: number;
//   session_id?: string;
//   error?: string;
// }

// const suggestedQuestions = [
//   "What's the salary distribution by department?",
//   "Are attendance penalties enabled?",
//   "Tell me about the payroll for this month..!",
// ];

// const TypingIndicator = () => {
//   return (
//     <div className="flex justify-start">
//       <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-md px-3 sm:px-4 py-3 sm:py-3.5 flex items-center space-x-2">
//         <div className="flex space-x-1">
//           <div
//             className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"
//             style={{animationDelay: "0ms", animationDuration: "1.4s"}}
//           ></div>
//           <div
//             className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"
//             style={{animationDelay: "200ms", animationDuration: "1.4s"}}
//           ></div>
//           <div
//             className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"
//             style={{animationDelay: "400ms", animationDuration: "1.4s"}}
//           ></div>
//         </div>
//         <p className="text-xs sm:text-sm text-gray-600 ml-2">AI is thinking...</p>
//       </div>
//     </div>
//   );
// };

// export default function AIAssistantWidget() {
//   const [isOpen, setIsOpen] = useState(false);
//   const [showHistory, setShowHistory] = useState(false);
//   const [messages, setMessages] = useState<DisplayMessage[]>([]);
//   const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
//   const [currentChatId, setCurrentChatId] = useState<string | null>(null);
//   const [inputValue, setInputValue] = useState("");
//   const [showTooltip, setShowTooltip] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isLoadingHistory, setIsLoadingHistory] = useState(false);
//   const [currentProcessingMessage, setCurrentProcessingMessage] = useState<string>("");
//   const [processingStep, setProcessingStep] = useState<number>(0);
//   const [totalSteps, setTotalSteps] = useState<number>(0);

//   const cardRef = useRef<HTMLDivElement>(null);
//   const historyRef = useRef<HTMLDivElement>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
//   const eventSourceRef = useRef<EventSource | null>(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages, isLoading]);

//   // Focus input when widget opens
//   useEffect(() => {
//     if (isOpen && inputRef.current) {
//       setTimeout(() => {
//         inputRef.current?.focus();
//       }, 100);
//     }
//   }, [isOpen]);

//   // Load chat history when component mounts or when widget opens
//   useEffect(() => {
//     if (isOpen && chatHistory.length === 0) {
//       loadChatHistory();
//     }
//   }, [isOpen]);

//   useEffect(() => {
//     return () => {
//       if (eventSourceRef.current) {
//         eventSourceRef.current.close();
//       }
//     };
//   }, []);

//   const loadChatHistory = async () => {
//     setIsLoadingHistory(true);
//     try {
//       // Replace with your actual endpoint
//       const response = await apiGet("/assistant/user-chats/");
//       const userChats: UserChats = response.data;
//       setChatHistory(userChats.chats || []);
//     } catch (error) {
//       console.error("Error loading chat history:", error);
//       setChatHistory([]);
//     } finally {
//       setIsLoadingHistory(false);
//     }
//   };

//   const convertChatMessagesToDisplay = (chatMessages: ChatMessage[]): DisplayMessage[] => {
//     return chatMessages.map((msg, index) => ({
//       id: `${msg.timestamp}-${index}`,
//       type: msg.role === "user" ? "user" : "assistant",
//       content: msg.message,
//       timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
//         hour: "2-digit",
//         minute: "2-digit",
//       }),
//     }));
//   };

//   const initializeSSEConnection = (sessionId: string) => {
//     if (eventSourceRef.current) {
//       eventSourceRef.current.close();
//     }

//     const baseURL = process.env.NEXT_PUBLIC_API_URL;
//     const eventSource = new EventSource(`${baseURL}/assistant/sse/?session_id=${sessionId}`);
//     eventSourceRef.current = eventSource;

//     eventSource.onopen = () => {
//       console.log("SSE connection opened");
//     };

//     eventSource.onmessage = (event) => {
//       try {
//         const data: SSEMessage = JSON.parse(event.data);
//         handleSSEMessage(data);
//       } catch (error) {
//         console.error("Error parsing SSE message:", error);
//       }
//     };

//     eventSource.onerror = (error) => {
//       console.error("SSE connection error:", error);
//       if (eventSource.readyState === EventSource.CLOSED) {
//         console.log("SSE connection closed");
//         setIsLoading(false);
//         setCurrentProcessingMessage("");
//         setProcessingStep(0);
//         setTotalSteps(0);
//       }
//     };
//   };

//   const handleSSEMessage = (data: SSEMessage) => {
//     console.log("Received SSE message:", data);

//     switch (data.type) {
//       case "connected":
//         console.log("SSE connected:", data.message);
//         break;

//       case "processing_start":
//         setCurrentProcessingMessage(data.message || "Starting to process...");
//         setProcessingStep(0);
//         setTotalSteps(0);
//         break;

//       case "progress":
//         setCurrentProcessingMessage(data.message || "Processing...");
//         if (data.step) setProcessingStep(data.step);
//         if (data.total_steps) setTotalSteps(data.total_steps);
//         break;

//       case "final_response":
//         setIsLoading(false);
//         setCurrentProcessingMessage("");
//         setProcessingStep(0);
//         setTotalSteps(0);

//         if (data.answer) {
//           const assistantMessage: DisplayMessage = {
//             id: Date.now().toString(),
//             type: "assistant",
//             content: data.answer,
//             timestamp: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}),
//             messageType: "final_response",
//           };

//           setMessages((prev) => [...prev, assistantMessage]);

//           loadChatHistory();
//         }

//         if (eventSourceRef.current) {
//           eventSourceRef.current.close();
//         }
//         break;

//       case "error":
//         setIsLoading(false);
//         setCurrentProcessingMessage("");
//         setProcessingStep(0);
//         setTotalSteps(0);

//         const errorMessage: DisplayMessage = {
//           id: Date.now().toString(),
//           type: "assistant",
//           content: data.message || "An error occurred while processing your request.",
//           timestamp: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}),
//           messageType: "error",
//         };

//         setMessages((prev) => [...prev, errorMessage]);

//         if (eventSourceRef.current) {
//           eventSourceRef.current.close();
//         }
//         break;

//       case "heartbeat":
//         break;

//       default:
//         console.log("Unknown SSE message type:", data.type);
//     }
//   };

//   const handleSendMessage = async () => {
//     if (!inputValue.trim() || isLoading) return;

//     const userMessage: DisplayMessage = {
//       id: Date.now().toString(),
//       type: "user",
//       content: inputValue.trim(),
//       timestamp: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}),
//     };

//     setMessages((prev) => [...prev, userMessage]);
//     const currentQuestion = inputValue.trim();
//     setInputValue("");
//     setIsLoading(true);

//     try {
//       const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//       initializeSSEConnection(sessionId);

//       const payload: any = {
//         question: currentQuestion,
//         session_id: sessionId,
//       };

//       if (currentChatId) {
//         payload.chat_id = currentChatId;
//       }

//       const response = await apiPost(`/assistant/`, payload);
//     } catch (error) {
//       setIsLoading(false);
//       setCurrentProcessingMessage("");
//       setProcessingStep(0);
//       setTotalSteps(0);

//       let errorMessage = "Failed to start processing. Please try again.";

//       if (error instanceof Error) {
//         errorMessage = error.message;
//       } else if (error && typeof error === "object" && "detail" in error) {
//         errorMessage = (error as any).detail;
//       }

//       const errorChatMessage: DisplayMessage = {
//         id: Date.now().toString(),
//         type: "assistant",
//         content: errorMessage,
//         timestamp: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}),
//         messageType: "error",
//       };

//       setMessages((prev) => [...prev, errorChatMessage]);

//       if (eventSourceRef.current) {
//         eventSourceRef.current.close();
//       }
//     }
//   };

//   const handleSuggestedQuestion = (question: string) => {
//     setInputValue(question);
//     setTimeout(() => {
//       inputRef.current?.focus();
//     }, 50);
//   };

//   const handleHistoryClick = (chat: ChatHistory) => {
//     setCurrentChatId(chat.chat_id);

//     const displayMessages = convertChatMessagesToDisplay(chat.messages);
//     setMessages(displayMessages);

//     setShowHistory(false);
//   };

//   const handleNewChat = () => {
//     setCurrentChatId(null);
//     setMessages([]);
//     setShowHistory(false);
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSendMessage();
//     }
//   };

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (showHistory && historyRef.current && !historyRef.current.contains(event.target as Node)) {
//         setShowHistory(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [showHistory]);

//   const formatChatTitle = (chat: ChatHistory) => {
//     // Use the title if it's not "New Chat", otherwise use first message preview
//     if (chat.title && chat.title !== "New Chat" && chat.title.trim()) {
//       return chat.title;
//     }

//     // Find the first user message
//     const firstUserMessage = chat.messages.find((msg) => msg.role === "user");
//     if (firstUserMessage) {
//       return firstUserMessage.message.length > 40
//         ? firstUserMessage.message.substring(0, 40) + "..."
//         : firstUserMessage.message;
//     }

//     return "New Chat";
//   };

//   const formatChatDate = (chat: ChatHistory) => {
//     if (chat.messages.length === 0) return "";

//     const lastMessage = chat.messages[chat.messages.length - 1];
//     const date = new Date(lastMessage.timestamp);
//     const now = new Date();
//     const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

//     if (diffInHours < 1) {
//       return "Just now";
//     } else if (diffInHours < 24) {
//       return `${Math.floor(diffInHours)}h ago`;
//     } else if (diffInHours < 48) {
//       return "Yesterday";
//     } else {
//       return date.toLocaleDateString();
//     }
//   };

//   return (
//     <>
//       {/* Custom CSS for better dot animation */}
//       <style jsx>{`
//         @keyframes typing-dots {
//           0%,
//           60%,
//           100% {
//             transform: translateY(0);
//             opacity: 0.4;
//           }
//           30% {
//             transform: translateY(-10px);
//             opacity: 1;
//           }
//         }
//         .typing-dot-1 {
//           animation: typing-dots 1.4s infinite ease-in-out;
//           animation-delay: 0ms;
//         }
//         .typing-dot-2 {
//           animation: typing-dots 1.4s infinite ease-in-out;
//           animation-delay: 200ms;
//         }
//         .typing-dot-3 {
//           animation: typing-dots 1.4s infinite ease-in-out;
//           animation-delay: 400ms;
//         }
//       `}</style>

//       <div className="fixed bottom-6 right-6 z-50">
//         {/* Tooltip for desktop */}
//         {showTooltip && !isOpen && (
//           <div className="absolute bottom-16 right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg animate-in fade-in duration-200 whitespace-nowrap">
//             AI Assistant
//             <div className="absolute bottom-0 right-6 transform translate-y-full">
//               <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900"></div>
//             </div>
//           </div>
//         )}

//         {/* Modal with Connection Tail */}
//         {isOpen && (
//           <div className="absolute bottom-16 right-0 mb-1">
//             {/* Stronger connection tail with animation */}
//             <div className="absolute bottom-0 right-6 transform translate-y-full z-20">
//               <div className="w-0 h-0 border-l-[18px] border-r-[18px] border-t-[18px] border-l-transparent border-r-transparent border-t-white drop-shadow-2xl animate-in fade-in duration-300"></div>
//               {/* Connection line */}
//               <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-3 bg-gradient-to-b from-white to-transparent opacity-80"></div>
//             </div>

//             <Card
//               ref={cardRef}
//               className="shadow-2xl border-0 bg-white rounded-2xl overflow-hidden relative animate-in slide-in-from-bottom-4 zoom-in-95 duration-300"
//             >
//               {/* Header */}
//               <CardHeader className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-white relative z-20">
//                 <div className="flex items-center justify-between">
//                   {!showHistory && (
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => setShowHistory(true)}
//                       className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors duration-200"
//                     >
//                       <Menu className="h-4 w-4 text-gray-600" />
//                     </Button>
//                   )}
//                   {showHistory && <div className="w-8 h-8" />}
//                   <div className="flex items-center gap-2">
//                     <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center">
//                       <Sparkles className="h-3 w-3 text-white" />
//                     </div>
//                     <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
//                       Peracosoft AI Assistant
//                     </h3>
//                   </div>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => setIsOpen(false)}
//                     className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors duration-200"
//                   >
//                     <X className="h-4 w-4 text-gray-600" />
//                   </Button>
//                 </div>
//               </CardHeader>

//               {/* Main Content Area */}
//               <div className="relative w-[85vw] max-w-[320px] sm:w-96 sm:max-w-[calc(100vw-3rem)] h-[50vh] sm:h-[450px] max-h-[600px] overflow-hidden">
//                 {/* History Full-Height Overlay */}
//                 {showHistory && (
//                   <div ref={historyRef} className="absolute inset-0 z-40 flex">
//                     {/* History Panel */}
//                     <div className="bg-white w-[75%] h-full flex flex-col shadow-xl">
//                       {/* History Header */}
//                       <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
//                         <h4 className="text-base sm:text-lg font-semibold text-gray-900">
//                           Chat History
//                         </h4>
//                         <Button
//                           variant="ghost"
//                           size="sm"
//                           onClick={() => setShowHistory(false)}
//                           className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors duration-200"
//                         >
//                           <X className="h-4 w-4 text-gray-600" />
//                         </Button>
//                       </div>

//                       {/* New Chat Button */}
//                       <div className="px-3 sm:px-6 py-3 border-b border-gray-100">
//                         <Button
//                           onClick={handleNewChat}
//                           variant="outline"
//                           className="w-full text-sm border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors duration-200"
//                         >
//                           <Sparkles className="h-4 w-4 mr-2" />
//                           New Chat
//                         </Button>
//                       </div>

//                       {/* History Content */}
//                       <div className="flex-1 overflow-y-auto p-3 sm:p-6">
//                         <div className="space-y-3 sm:space-y-4">
//                           {isLoadingHistory ? (
//                             <div className="text-center py-8">
//                               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-3"></div>
//                               <p className="text-sm text-gray-500">Loading chats...</p>
//                             </div>
//                           ) : chatHistory.length === 0 ? (
//                             <div className="text-center py-8">
//                               <p className="text-sm text-gray-500">No chat history yet</p>
//                               <p className="text-xs text-gray-400 mt-1">
//                                 Start a conversation to see your chats here
//                               </p>
//                             </div>
//                           ) : (
//                             chatHistory.map((chat) => (
//                               <div
//                                 key={chat.chat_id}
//                                 className={`cursor-pointer hover:bg-gray-50 p-3 sm:p-4 rounded-lg transition-colors duration-150 -mx-1 sm:-mx-2 border-l-2 ${
//                                   currentChatId === chat.chat_id
//                                     ? "border-red-500 bg-red-50"
//                                     : "border-transparent"
//                                 }`}
//                                 onClick={() => handleHistoryClick(chat)}
//                               >
//                                 <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2 leading-relaxed break-words">
//                                   {formatChatTitle(chat)}
//                                 </p>
//                                 <div className="flex justify-between items-center">
//                                   <p className="text-xs text-gray-500">
//                                     {chat.messages.length} message
//                                     {chat.messages.length !== 1 ? "s" : ""}
//                                   </p>
//                                   <p className="text-xs text-gray-400">{formatChatDate(chat)}</p>
//                                 </div>
//                               </div>
//                             ))
//                           )}
//                         </div>
//                       </div>
//                     </div>

//                     {/* Right side - Dimmed background showing original content */}
//                     <div
//                       className="bg-black bg-opacity-30 w-[25%] h-full cursor-pointer"
//                       onClick={() => setShowHistory(false)}
//                     />
//                   </div>
//                 )}

//                 {/* Main Chat Area */}
//                 <div className="w-full h-full flex flex-col relative">
//                   <CardContent className="flex-1 flex flex-col p-0 relative min-h-0">
//                     {messages.length === 0 ? (
//                       // Welcome State
//                       <div className="flex-1 flex flex-col min-h-0">
//                         <div className="flex-1 overflow-y-auto">
//                           <div className="flex flex-col items-center justify-center p-4 sm:p-6 min-h-full">
//                             <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mb-4 sm:mb-6 border border-red-200">
//                               <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center">
//                                 <Sparkles className="h-4 sm:h-5 w-4 sm:w-5 text-white animate-pulse" />
//                               </div>
//                             </div>
//                             <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3 text-center">
//                               What Can I Help You With?
//                             </h4>
//                             <p className="text-xs sm:text-sm text-gray-600 text-center mb-4 sm:mb-6 max-w-xs leading-relaxed px-2">
//                               Ask me anything about your hr system from employee, attendance and
//                               payroll reports to orders, business assets, and analytics.
//                             </p>

//                             {/* Suggested Questions */}
//                             <div className="w-full space-y-2 mb-3 sm:mb-4 px-2">
//                               {suggestedQuestions.slice(0, 2).map((question, index) => (
//                                 <Button
//                                   key={index}
//                                   variant="outline"
//                                   className="w-full text-left justify-start h-auto py-2 sm:py-2.5 px-2 sm:px-3 text-xs sm:text-sm border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg transition-colors duration-150 whitespace-normal break-words"
//                                   onClick={() => handleSuggestedQuestion(question)}
//                                 >
//                                   {question}
//                                 </Button>
//                               ))}
//                             </div>

//                             <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 px-2">
//                               {suggestedQuestions.slice(2).map((question, index) => (
//                                 <Button
//                                   key={index + 2}
//                                   variant="outline"
//                                   className="text-left justify-start h-auto py-2 sm:py-2.5 px-2 sm:px-2.5 text-xs border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg transition-colors duration-150 whitespace-normal break-words"
//                                   onClick={() => handleSuggestedQuestion(question)}
//                                 >
//                                   {question}
//                                 </Button>
//                               ))}
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     ) : (
//                       // Chat Messages - Properly Scrollable
//                       <div className="flex-1 flex flex-col min-h-0">
//                         <div className="flex-1 overflow-y-auto">
//                           <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
//                             <div className="text-center mb-3 sm:mb-4">
//                               <p className="text-xs text-gray-500">
//                                 {new Date().toLocaleDateString("en-US", {
//                                   weekday: "long",
//                                   year: "numeric",
//                                   month: "long",
//                                   day: "numeric",
//                                 })}
//                               </p>
//                               {currentChatId && (
//                                 <p className="text-xs text-red-600 mt-1">
//                                   Continuing previous conversation
//                                 </p>
//                               )}
//                             </div>

//                             {messages.map((message) => (
//                               <div key={message.id} className="flex flex-col space-y-1">
//                                 {message.type === "user" ? (
//                                   <div className="flex justify-end">
//                                     <div
//                                       className="bg-red-500 text-white rounded-2xl rounded-tr-md px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm transform transition-all duration-200 hover:shadow-md break-words hyphens-auto"
//                                       style={{maxWidth: "85%"}}
//                                     >
//                                       <p className="text-xs sm:text-sm leading-relaxed break-words">
//                                         {message.content}
//                                       </p>
//                                     </div>
//                                   </div>
//                                 ) : (
//                                   <div className="flex justify-start">
//                                     <div
//                                       className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-md px-3 sm:px-4 py-2 sm:py-2.5 transform transition-all duration-200 hover:shadow-sm break-words hyphens-auto"
//                                       style={{maxWidth: "85%"}}
//                                     >
//                                       <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
//                                         {message.content}
//                                       </p>
//                                     </div>
//                                   </div>
//                                 )}
//                                 <p
//                                   className="text-xs text-gray-400 px-1"
//                                   style={{textAlign: message.type === "user" ? "right" : "left"}}
//                                 >
//                                   {message.timestamp}
//                                 </p>
//                               </div>
//                             ))}

//                             {/* Enhanced typing indicator with progress */}
//                             {isLoading && <TypingIndicator />}

//                             {/* Scroll anchor */}
//                             <div ref={messagesEndRef} />
//                           </div>
//                         </div>
//                       </div>
//                     )}

//                     {/* Input Area */}
//                     <div className="shrink-0 p-3 sm:p-4 border-t border-gray-100 bg-white relative z-10">
//                       <div className="flex items-center space-x-2 sm:space-x-3">
//                         <Input
//                           ref={inputRef}
//                           placeholder="Type your question here..."
//                           value={inputValue}
//                           onChange={(e) => setInputValue(e.target.value)}
//                           onKeyPress={handleKeyPress}
//                           disabled={isLoading}
//                           className="flex-1 border-gray-200 focus:border-red-500 focus:ring-red-500 rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm placeholder:text-gray-400 transition-colors duration-200 overflow-hidden disabled:opacity-50"
//                         />
//                         <Button
//                           onClick={handleSendMessage}
//                           disabled={!inputValue.trim() || isLoading}
//                           className="bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-full shadow-sm transition-all duration-200 hover:shadow-md transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
//                         >
//                           {isLoading ? (
//                             <div className="flex space-x-0.5">
//                               <div className="w-1 h-1 bg-gray-400 rounded-full typing-dot-1"></div>
//                               <div className="w-1 h-1 bg-gray-400 rounded-full typing-dot-2"></div>
//                               <div className="w-1 h-1 bg-gray-400 rounded-full typing-dot-3"></div>
//                             </div>
//                           ) : (
//                             <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
//                           )}
//                         </Button>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </div>
//               </div>
//             </Card>
//           </div>
//         )}

//         {/* Beautiful Floating Action Button */}
//         <div className="flex flex-col items-end">
//           {!isOpen ? (
//             <Button
//               onClick={() => setIsOpen(true)}
//               onMouseEnter={() => setShowTooltip(true)}
//               onMouseLeave={() => setShowTooltip(false)}
//               className="relative bg-gradient-to-br from-red-600 via-orange-700 to-red-700 hover:from-red-700 hover:via-orange-800 hover:to-red-800 text-white rounded-full h-14 w-14 p-0 shadow-xl transition-all duration-300 hover:shadow-2xl transform hover:scale-110 group overflow-hidden"
//             >
//               <div className="absolute inset-0 bg-gradient-to-br from-red-400 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>

//               <div className="relative z-10 flex items-center justify-center">
//                 <div className="relative">
//                   <Bot className="h-6 w-6 transform group-hover:scale-110 transition-transform duration-300" />
//                   <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
//                     <Sparkles className="h-2 w-2 text-white" />
//                   </div>
//                 </div>
//               </div>

//               <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-300"></div>
//             </Button>
//           ) : (
//             <Button
//               onClick={() => setIsOpen(false)}
//               className="bg-gradient-to-br from-red-600 to-orange-700 hover:from-orange-700 hover:to-red-800 text-white rounded-full h-14 w-14 p-0 shadow-xl transition-all duration-300 hover:shadow-2xl transform hover:scale-110"
//             >
//               <X className="h-6 w-6" />
//             </Button>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }
