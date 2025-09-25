import React from "react";
import DOMPurify from "dompurify";

interface RichTextDisplayProps {
	content: string;
	className?: string;
}

const RichTextDisplay: React.FC<RichTextDisplayProps> = ({ content, className }) => {
	const sanitizedContent = DOMPurify.sanitize(content);

	return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
};

export default RichTextDisplay;
