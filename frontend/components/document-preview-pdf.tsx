import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import { getCUrrentInstitution } from "@/lib/helpers";

const styles = StyleSheet.create({
	page: {
		padding: 30,
		fontSize: 12,
	},
	header: {
		marginBottom: 20,
		textAlign: "center",
	},
	title: {
		fontSize: 20,
		marginBottom: 10,
		fontWeight: "bold",
	},
	company: {
		fontSize: 16,
		marginBottom: 5,
	},
	date: {
		fontSize: 12,
		color: "#666",
		marginBottom: 20,
	},
	content: {
		marginTop: 20,
		fontSize: 12,
		lineHeight: 1.6,
	},
	footer: {
		position: "absolute",
		bottom: 30,
		left: 30,
		right: 30,
		textAlign: "center",
		color: "#666",
		fontSize: 10,
		borderTopWidth: 1,
		borderTopColor: "#e5e5e5",
		paddingTop: 10,
	},
});

interface DocumentPreviewPDFProps {
	content: string;
	templateName: string;
}

const DocumentPreviewPDF = ({ content, templateName }: DocumentPreviewPDFProps) => {
	const currentInstitution = getCUrrentInstitution();

	const formatDate = (date: Date) =>
		date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>{templateName}</Text>
					<Text style={styles.company}>
						{currentInstitution?.institution_name || "Company Name"}
					</Text>
					<Text style={styles.date}>Generated on {formatDate(new Date())}</Text>
				</View>

				{/* Content */}
				<View style={styles.content}>
					<Text>{content}</Text>
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<Text>Generated on {formatDate(new Date())}</Text>
					<Text style={{ marginTop: 5 }}>
						This is a computer-generated document and needs no signature
					</Text>
				</View>
			</Page>
		</Document>
	);
};

export default DocumentPreviewPDF;
