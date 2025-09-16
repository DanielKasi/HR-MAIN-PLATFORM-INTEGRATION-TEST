"use client";
import React, { useState, useEffect } from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfjs } from "react-pdf";
import { Document as PdfDocument, Page as PdfPage } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set the worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const styles = StyleSheet.create({
	page: {
		flexDirection: "column",
		backgroundColor: "#ffffff",
		padding: 30,
		width: "210mm",
		height: "297mm", // A4 size
	},
	section: {
		margin: 10,
		fontSize: 12,
		lineHeight: 1.5,
	},
	header: {
		fontSize: 18,
		marginBottom: 10,
		fontWeight: "bold",
	},
	pdfContainer: {
		border: "1px solid #ddd",
		boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
		overflow: "auto" as "hidden",
		maxHeight: "80vh",
	},
});

interface PdfPreviewProps {
	source: string | null; // Can be PDF path, plain text, or HTML
	type?: "pdf" | "text" | "html"; // Specify the input type
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ source, type = "text" }) => {
	const [numPages, setNumPages] = useState<number | null>(null);

	useEffect(() => {
		if (type === "pdf" && source) {
			// This effect is only for react-pdf to determine page count
			const loadingTask = pdfjs.getDocument(source);

			loadingTask.promise.then((pdf) => setNumPages(pdf.numPages)).catch(() => setNumPages(1));
		}
	}, [source, type]);

	const renderContent = () => {
		if (!source) return <Text>No content to preview</Text>;

		if (type === "pdf" && source) {
			return (
				<PdfDocument file={source} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
					{Array.from(new Array(numPages), (el, index) => (
						<PdfPage key={`page_${index + 1}`} pageNumber={index + 1} width={595} />
					))}
				</PdfDocument>
			);
		}

		if (type === "html") {
			const text = source.replace(/<\/?[^>]+(>|$)/g, ""); // Basic HTML to text

			return (
				<Document>
					<Page size="A4" style={styles.page}>
						<View style={styles.header}>Preview</View>
						<View style={styles.section}>
							<Text>{text}</Text>
						</View>
					</Page>
				</Document>
			);
		}

		return (
			<Document>
				<Page size="A4" style={styles.page}>
					<View style={styles.header}>Preview</View>
					<View style={styles.section}>
						<Text>{source}</Text>
					</View>
				</Page>
			</Document>
		);
	};

	return (
		<div className="pdf-preview" style={styles.pdfContainer as any}>
			{renderContent()}
		</div>
	);
};

export default PdfPreview;
