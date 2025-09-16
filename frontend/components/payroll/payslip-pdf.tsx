import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import { IPayslip } from "@/types/types.utils";
import { formatCurrency, getCUrrentInstitution } from "@/lib/helpers";

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
	period: {
		fontSize: 14,
		color: "#666",
		marginBottom: 20,
	},
	section: {
		margin: 10,
		padding: 10,
	},
	table: {
		width: "100%",
		marginBottom: 10,
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e5e5",
		paddingVertical: 8,
	},
	tableHeader: {
		backgroundColor: "#f3f4f6",
		fontWeight: "bold",
	},
	tableCellLeft: {
		flex: 2,
		paddingHorizontal: 8,
	},
	tableCellRight: {
		flex: 1,
		textAlign: "right",
		paddingHorizontal: 8,
	},
	bold: {
		fontWeight: "bold",
	},
	employeeInfo: {
		marginBottom: 20,
		padding: 10,
		backgroundColor: "#f9fafb",
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
	summaryBox: {
		backgroundColor: "#f3f4f6",
		padding: 10,
		marginTop: 10,
		borderWidth: 1,
		borderColor: "#e5e5e5",
	},
});

interface PayslipPDFProps {
	payslip: IPayslip;
}

const PayslipPDF = ({ payslip }: PayslipPDFProps) => {
	const currentInstitution = getCUrrentInstitution();

	const formatDate = (date: string) =>
		new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>PAYSLIP</Text>
					<Text style={styles.company}>
						{currentInstitution?.institution_name || "Company Name"}
					</Text>
					<Text style={styles.period}>
						Pay Period: {payslip.payroll_period.name}
						{"\n"}({formatDate(payslip.payroll_period.start_date)} -{" "}
						{formatDate(payslip.payroll_period.end_date)})
					</Text>
				</View>

				{/* Employee Information */}
				<View style={styles.employeeInfo}>
					<View style={styles.tableRow}>
						<View style={styles.tableCellLeft}>
							<Text style={styles.bold}>Employee Name:</Text>
							<Text>{payslip.employee.user?.fullname}</Text>
						</View>
						<View style={styles.tableCellLeft}>
							<Text style={styles.bold}>Employee ID:</Text>
							<Text>{payslip.employee.id}</Text>
						</View>
					</View>
					<View style={styles.tableRow}>
						<View style={styles.tableCellLeft}>
							<Text style={styles.bold}>Department:</Text>
							<Text>{payslip.employee.department?.name || "N/A"}</Text>
						</View>
						<View style={styles.tableCellLeft}>
							<Text style={styles.bold}>Days Worked:</Text>
							<Text>{payslip.days_worked} days</Text>
						</View>
					</View>
				</View>

				{/* Salary Breakdown */}
				<View style={styles.section}>
					<View style={styles.table}>
						<View style={[styles.tableRow, styles.tableHeader]}>
							<View style={styles.tableCellLeft}>
								<Text>Description</Text>
							</View>
							<View style={styles.tableCellRight}>
								<Text>Amount</Text>
							</View>
						</View>

						<View style={styles.tableRow}>
							<View style={styles.tableCellLeft}>
								<Text>Basic Salary</Text>
							</View>
							<View style={styles.tableCellRight}>
								<Text>{formatCurrency(payslip.basic_salary)}</Text>
							</View>
						</View>

						<View style={styles.tableRow}>
							<View style={styles.tableCellLeft}>
								<Text>Total Allowances</Text>
							</View>
							<View style={styles.tableCellRight}>
								<Text>{formatCurrency(payslip.total_allowances)}</Text>
							</View>
						</View>

						<View style={[styles.tableRow, styles.bold]}>
							<View style={styles.tableCellLeft}>
								<Text>Gross Salary</Text>
							</View>
							<View style={styles.tableCellRight}>
								<Text>{formatCurrency(payslip.gross_salary)}</Text>
							</View>
						</View>

						<View style={styles.tableRow}>
							<View style={styles.tableCellLeft}>
								<Text>Total Deductions</Text>
							</View>
							<View style={styles.tableCellRight}>
								<Text>- {formatCurrency(payslip.total_deductions)}</Text>
							</View>
						</View>
					</View>

					{/* Net Pay Summary */}
					<View style={styles.summaryBox}>
						<View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
							<View style={styles.tableCellLeft}>
								<Text style={styles.bold}>NET PAY</Text>
							</View>
							<View style={styles.tableCellRight}>
								<Text style={styles.bold}>{formatCurrency(payslip.net_salary)}</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Payment Status */}
				<View style={[styles.section, { marginTop: 20 }]}>
					<Text>Payment Status: {payslip.is_paid ? "Paid" : "Pending"}</Text>
					{payslip.is_paid && payslip.paid_date && (
						<Text>Payment Date: {formatDate(payslip.paid_date)}</Text>
					)}
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<Text>Generated on {formatDate(new Date().toISOString())}</Text>
					<Text style={{ marginTop: 5 }}>
						This is a computer-generated document and needs no signature
					</Text>
				</View>
			</Page>
		</Document>
	);
};

export default PayslipPDF;
