"use client";

import { useEffect, useState } from "react";
import { ElementFormatType, SerializedLexicalNode } from "lexical";
import { Editor } from "@/components/blocks/editor-00/editor";

interface SerializedTextNode extends SerializedLexicalNode {
	type: "text";
	text: string;
	detail: number;
	format: number;
	mode: string;
	style: string;
}

interface SerializedParagraphNode extends SerializedLexicalNode {
	type: "paragraph";
	children: (SerializedTextNode | SerializedLexicalNode)[];
	direction: "ltr" | "rtl" | null;
	format: ElementFormatType;
	indent: number;
}

interface SerializedRootNode extends SerializedLexicalNode {
	type: string;
	children: (SerializedParagraphNode | SerializedLexicalNode)[];
	direction: "ltr" | "rtl" | null;
	format: ElementFormatType;
	indent: number;
}

interface CustomSerializedEditorState {
	root: SerializedRootNode;
}

interface IRichTextEditorFieldProps {
	value: string;
	onChange: (value: string) => void;
	maxLength?: number;
}

export default function ShadcnRichTextEditor({
	value,
	onChange,
	maxLength,
}: IRichTextEditorFieldProps) {
	const initialValue: CustomSerializedEditorState = {
		root: {
			children: [
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: value,
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	};

	const [editorState, setEditorState] = useState<CustomSerializedEditorState>(initialValue);

	useEffect(() => {
		const newState: CustomSerializedEditorState = {
			...editorState,
			root: {
				...editorState.root,
				children: [
					{
						children: [
							{
								detail: 0,
								format: 0,
								mode: "normal",
								style: "",
								text: maxLength ? value.slice(0, maxLength) : value,
								type: "text",
								version: 1,
							},
						],
						direction: "ltr",
						format: "",
						indent: 0,
						type: "paragraph",
						version: 1,
					},
				],
			},
		};

		setEditorState(newState);
	}, [value]);

	return (
		<Editor
			editorSerializedState={editorState}
			onSerializedChange={(value: CustomSerializedEditorState) => {
				setEditorState(value);
				const firstParagraph = value.root.children[0] as SerializedParagraphNode;
				const firstTextNode = firstParagraph.children[0] as SerializedTextNode;
				onChange(firstTextNode.text);
			}}
		/>
	);
}
