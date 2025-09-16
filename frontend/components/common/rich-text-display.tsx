import React from "react";
import DOMPurify from "dompurify";

interface RichTextDisplayProps {
	htmlContent: string;
	className?: string;
}

const RichTextDisplay: React.FC<RichTextDisplayProps> = ({ htmlContent, className }) => {
	const sanitizedContent = DOMPurify.sanitize(htmlContent);

	return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
};

export default RichTextDisplay;
