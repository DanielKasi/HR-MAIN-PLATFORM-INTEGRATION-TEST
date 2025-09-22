import { SerializedEditorState, SerializedLexicalNode } from "lexical";

// Interface for a Text node
interface SerializedTextNode extends SerializedLexicalNode {
	type: "text";
	text: string;
	detail: number;
	format: number;
	mode: string;
	style: string;
}

// Interface for a Paragraph node
interface SerializedParagraphNode extends SerializedLexicalNode {
	type: "paragraph";
	children: (SerializedTextNode | SerializedLexicalNode)[];
	direction: string;
	format: string;
	indent: number;
}

// Interface for the Root node
interface SerializedRootNode extends SerializedLexicalNode {
	type: "root";
	children: (SerializedParagraphNode | SerializedLexicalNode)[];
	direction: string;
	format: string;
	indent: number;
}

interface CustomSerializedEditorState {
	root: SerializedRootNode;
}
