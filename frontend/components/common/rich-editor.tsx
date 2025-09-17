"use client";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import "../../styles/rich-editor.css"; // Custom styles for the rich editor
import ReactQuill from "react-quill-new";

const ReactQuillInstance = dynamic(() => import("react-quill-new"), { ssr: false });

interface IRichEditorFieldProps extends ReactQuill.ReactQuillProps {
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	maxLength?: number;
}

export const RichEditorField = (props: IRichEditorFieldProps) => {
	const { placeholder, value, onChange, disabled, maxLength } = props;

	const modules = {
		toolbar: [
			[{ header: [1, 2, 3, 4, 5, 6, false] }],
			["bold", "italic", "underline", "strike"],
			[{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
			[{ indent: "-1" }, { indent: "+1" }],
			[{ align: [] }],
			["link", "image", "video"],
			[{ color: [] }, { background: [] }],
			[{ font: [] }],
			[{ size: ["small", false, "large", "huge"] }],
			["clean"],
			["table"], // Requires additional setup for table module (see notes)
		],
	};

	const formats = [
		"header",
		"bold",
		"italic",
		"underline",
		"strike",
		"list",
		"indent",
		"align",
		"link",
		"image",
		"video",
		"color",
		"background",
		"font",
		"size",
		"table",
		"table-row",
	];

	return (
		<ReactQuillInstance
			placeholder={placeholder}
			value={maxLength ? value.slice(0, maxLength) : value}
			modules={modules}
			onChange={onChange}
			className="rich-editor-container"
			readOnly={disabled}
			formats={formats}
		/>
	);
};
