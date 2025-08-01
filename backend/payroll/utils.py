from django.utils import timezone
from datetime import timedelta, date, datetime
from decimal import Decimal
from .models import AllowanceType, DeductionType, PayrollPeriod, Payslip, PayslipItem
from employee.models import Employee
from institution.models import Institution, InstitutionBankAccount, InstitutionBankType
from django.shortcuts import get_object_or_404


import io
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter
from .models import Payslip, PayrollPeriod


def generate_eft_excel(payroll_period_id: int):
    try:
        payroll_period = PayrollPeriod.objects.get(id=payroll_period_id)
    except PayrollPeriod.DoesNotExist:
        raise ValueError(f"PayrollPeriod with ID {payroll_period_id} not found.")

    institution_bank_account = InstitutionBankAccount.objects.filter(
        institution_bank__institution=payroll_period.institution
    ).first()

    if not institution_bank_account:
        raise ValueError(
            "No institution bank account found for the payroll period's institution."
        )

    wb = Workbook()
    ws = wb.active
    ws.title = "EFT Upload"

    bold_font = Font(bold=True)
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )
    light_blue_fill = PatternFill(
        start_color="D9E1F2", end_color="D9E1F2", fill_type="solid"
    )
    dark_blue_fill = PatternFill(
        start_color="4472C4", end_color="4472C4", fill_type="solid"
    )
    white_font = Font(color="FFFFFF", bold=True)
    red_font = Font(color="FF0000")

    ws.column_dimensions["A"].width = 18
    ws.column_dimensions["B"].width = 12
    ws.column_dimensions["C"].width = 12
    ws.column_dimensions["D"].width = 18
    ws.column_dimensions["E"].width = 15
    ws.column_dimensions["F"].width = 20
    ws.column_dimensions["G"].width = 18
    ws.column_dimensions["H"].width = 18

    ws.merge_cells("D1:F1")
    ws["D1"] = "BULK EFT UPLOAD TEMPLATE"
    ws["D1"].font = bold_font
    ws["D1"].alignment = center_align

    ws["G1"] = f"Date {date.today().strftime('%d-%b-%y')}"

    ws["G1"].alignment = Alignment(horizontal="right")

    # # Row 2: Instructions
    # ws["B2"] = "Point in B2 to read instructions"
    # ws["B2"].font = red_font

    # Row 3: Salary Period, Chq Amount
    ws["A3"] = "SALARY PERIOD"
    ws["A3"].font = bold_font
    ws["B3"] = payroll_period.start_date.strftime("%m/%Y")  # e.g., 08/2025
    ws["E3"] = "Chq Amount"
    ws["F3"] = "-"

    # Row 4: Item Count
    ws["E4"] = "Item Count"
    # Item count will be filled later after counting payslips
    ws["F4"] = 0

    # Row 5: Debit Account
    ws["A5"] = "DEBIT ACCOUNT*"
    ws["A5"].font = bold_font
    ws["B5"] = (
        institution_bank_account.account_number if institution_bank_account else ""
    )
    ws["B5"].fill = light_blue_fill

    ws["E5"] = "Account Name*"
    ws["E5"].font = bold_font
    ws["F5"] = institution_bank_account.account_name if institution_bank_account else ""
    ws["F5"].fill = light_blue_fill

    # # Row 7: CLEAN button
    # ws["E7"] = "CLEAN"
    # ws["E7"].font = white_font
    # ws["E7"].fill = dark_blue_fill
    # ws["E7"].alignment = center_align

    # Data Headers (Row 9)
    headers = [
        "DR ACCOUNT NO.",
        "BNKCODE",
        "BRCODE",
        "CR ACCOUNT*",
        "AMOUNT*",
        "BENEFICIARY NAME*",
        "DR ACCOUNT NAME",
        "BANK NAME*",
    ]
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=9, column=col_num, value=header)
        cell.font = bold_font
        cell.alignment = center_align
        cell.border = thin_border

    # Populate data from Payslips (starting from row 10)
    payslips = (
        Payslip.objects.filter(payroll_period=payroll_period)
        .select_related(
            "employee__user",
            "employee__payroll_branch__institution",
        )
        .prefetch_related("employee__payroll_branch__institution__banks")
    )

    row_num = 10
    total_amount = Decimal("0.00")
    item_count = 0

    for payslip in payslips:
        employee = payslip.employee
        beneficiary_name = f"{employee.user.fullname}" if employee.user else "N/A"

        # Try to find the bank code and branch code for the employee's bank
        bank_type = None
        if (
            employee.bank
            and employee.payroll_branch
            and employee.payroll_branch.institution
        ):
            bank_type = InstitutionBankType.objects.filter(
                institution=employee.payroll_branch.institution,
                bank_fullname__iexact=employee.bank,
            ).first()

        bank_code = bank_type.bank_code if bank_type else ""
        br_code = bank_type.br_code if bank_type else ""

        data_row = [
            (
                institution_bank_account.account_number
                if institution_bank_account
                else ""
            ),  # DR ACCOUNT NO.
            bank_code,  # BNKCODE
            br_code,  # BRCODE
            employee.bank_account_number,  # CR ACCOUNT*
            float(
                payslip.net_salary
            ),  # AMOUNT* (convert Decimal to float for openpyxl)
            beneficiary_name,  # BENEFICIARY NAME*
            (
                institution_bank_account.account_name
                if institution_bank_account
                else ""
            ),  # DR ACCOUNT NAME
            employee.bank,  # BANK NAME*
        ]

        for col_num, cell_value in enumerate(data_row, 1):
            cell = ws.cell(row=row_num, column=col_num, value=cell_value)
            cell.border = thin_border
            if col_num in [
                2,
                4,
                5,
                6,
                8,
            ]:  # Apply light blue fill to specific data columns as per image
                cell.fill = light_blue_fill
            if col_num == 5:  # Amount column, right align
                cell.alignment = Alignment(horizontal="right")
            else:
                cell.alignment = left_align

        total_amount += payslip.net_salary
        item_count += 1
        row_num += 1

    # Update Item Count and Chq Amount
    ws["F4"] = item_count
    ws["F3"] = float(total_amount)  # Chq Amount

    excel_file = io.BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)

    return excel_file


class PayrollProcessor:
    """
    Utility class to handle payroll processing operations
    """

    @staticmethod
    def create_monthly_period(year, month):
        """
        Create a monthly payroll period
        """
        from calendar import monthrange

        start_date = datetime(year, month, 1).date()
        last_day = monthrange(year, month)[1]
        end_date = datetime(year, month, last_day).date()

        # Set pay_date to last working day or a few days after month end
        pay_date = end_date + timedelta(days=3)

        period_name = f"{start_date.strftime('%B %Y')}"

        period, created = PayrollPeriod.objects.get_or_create(
            name=period_name,
            start_date=start_date,
            defaults={
                "end_date": end_date,
                "pay_date": pay_date,
            },
        )
        return period, created

    @staticmethod
    def generate_payslips_for_period(payroll_period, employee_ids=None):
        """
        Generate payslips for a given payroll period and mark the period as processed.
        """
        if isinstance(payroll_period, int):
            payroll_period = get_object_or_404(PayrollPeriod, id=payroll_period)

        employees = Employee.objects.filter(is_active=True)
        if employee_ids:
            employees = employees.filter(id__in=employee_ids)

        created_payslips = []

        for employee in employees:
            payslip, created = Payslip.objects.get_or_create(
                employee=employee,
                payroll_period=payroll_period,
                defaults={
                    "basic_salary": employee.salary or 0,
                },
            )

            if created or not payslip.is_paid:
                payslip.calculate_totals()
                PayrollProcessor.generate_payslip_items(payslip)
                created_payslips.append(payslip)

        if created_payslips:
            payroll_period.is_processed = True
            payroll_period.save()

        return created_payslips

    @staticmethod
    def generate_payslip_items(payslip):
        """
        Generate detailed payslip items for allowances and deductions
        """
        # Clear existing items
        payslip.items.all().delete()

        items_to_create = []

        # Add allowances
        for allowance in payslip.employee.allowances.filter(is_active=True):
            if allowance.effective_from <= payslip.payroll_period.end_date and (
                not allowance.effective_to
                or allowance.effective_to >= payslip.payroll_period.start_date
            ):

                amount = allowance.get_calculated_amount()
                items_to_create.append(
                    PayslipItem(
                        payslip=payslip,
                        item_type="allowance",
                        name=allowance.allowance_type.name,
                        amount=amount,
                        description=f"{allowance.calculation_method}: {allowance.amount if allowance.calculation_method == 'fixed' else f'{allowance.percentage}%'}",
                    )
                )

        # Add deductions
        for deduction in payslip.employee.deductions.filter(is_active=True):
            if deduction.effective_from <= payslip.payroll_period.end_date and (
                not deduction.effective_to
                or deduction.effective_to >= payslip.payroll_period.start_date
            ):

                amount = deduction.get_calculated_amount()
                items_to_create.append(
                    PayslipItem(
                        payslip=payslip,
                        item_type="deduction",
                        name=deduction.deduction_type.name,
                        amount=amount,
                        description=f"{deduction.calculation_method}: {deduction.amount if deduction.calculation_method == 'fixed' else f'{deduction.percentage}%'}",
                    )
                )

        # Add overtime if applicable
        # if payslip.overtime_amount > 0:
        #     items_to_create.append(
        #         PayslipItem(
        #             payslip=payslip,
        #             item_type='overtime',
        #             name='Overtime Pay',
        #             amount=payslip.overtime_amount,
        #             description=f"{payslip.overtime_hours} hours @ {payslip.overtime_rate} per hour"
        #         )
        #     )

        # Bulk create items
        PayslipItem.objects.bulk_create(items_to_create)

    @staticmethod
    def setup_default_payroll_types_for_institution(institution):
        """
        Create default allowance and deduction types for a specific institution
        """

        # Default allowances
        default_allowances = [
            {
                "name": "Housing Allowance",
                "description": "Monthly housing allowance",
                "is_taxable": True,
            },
            {
                "name": "Transport Allowance",
                "description": "Monthly transport allowance",
                "is_taxable": True,
            },
            {
                "name": "Medical Allowance",
                "description": "Monthly medical allowance",
                "is_taxable": False,
            },
            {
                "name": "Lunch Allowance",
                "description": "Daily lunch allowance",
                "is_taxable": True,
            },
            {
                "name": "Bonus",
                "description": "Performance or annual bonus",
                "is_taxable": True,
            },
            {
                "name": "Overtime Allowance",
                "description": "Overtime payment allowance",
                "is_taxable": True,
            },
            {
                "name": "Communication Allowance",
                "description": "Monthly communication allowance",
                "is_taxable": True,
            },
        ]

        # Default deductions
        default_deductions = [
            {
                "name": "Income Tax",
                "description": "Monthly income tax (PAYE)",
                "is_mandatory": True,
            },
            {
                "name": "NSSF",
                "description": "National Social Security Fund contribution",
                "is_mandatory": True,
            },
            {
                "name": "Health Insurance",
                "description": "Monthly health insurance premium",
                "is_mandatory": False,
            },
            {
                "name": "Loan Repayment",
                "description": "Monthly loan repayment",
                "is_mandatory": False,
            },
            {
                "name": "Union Dues",
                "description": "Monthly union membership fees",
                "is_mandatory": False,
            },
            {
                "name": "Professional Tax",
                "description": "Professional body membership fees",
                "is_mandatory": False,
            },
            {
                "name": "Advance Salary",
                "description": "Salary advance repayment",
                "is_mandatory": False,
            },
        ]

        created_allowances = []
        created_deductions = []

        # Create allowance types
        for allowance_data in default_allowances:
            allowance_type, created = AllowanceType.objects.get_or_create(
                institution=institution,
                name=allowance_data["name"],
                defaults={
                    "description": allowance_data["description"],
                    "is_taxable": allowance_data["is_taxable"],
                    "is_active": True,
                },
            )
            if created:
                created_allowances.append(allowance_type)

        # Create deduction types
        for deduction_data in default_deductions:
            deduction_type, created = DeductionType.objects.get_or_create(
                institution=institution,
                name=deduction_data["name"],
                defaults={
                    "description": deduction_data["description"],
                    "is_mandatory": deduction_data["is_mandatory"],
                    "is_active": True,
                },
            )
            if created:
                created_deductions.append(deduction_type)

        return {
            "allowances_created": len(created_allowances),
            "deductions_created": len(created_deductions),
            "allowance_types": created_allowances,
            "deduction_types": created_deductions,
        }

    @staticmethod  # Fixed: Added @staticmethod decorator
    def create_institution_with_defaults(**kwargs):
        """
        Helper function to create institution with default payroll types
        """
        institution = Institution.objects.create(**kwargs)
        setup_result = PayrollProcessor.setup_default_payroll_types_for_institution(
            institution
        )

        return institution, setup_result

    @staticmethod
    def get_employee_payroll_summary(employee, year=None):
        """
        Get annual payroll summary for an employee
        """
        if not year:
            year = timezone.now().year

        payslips = Payslip.objects.filter(
            employee=employee, payroll_period__start_date__year=year
        ).order_by("payroll_period__start_date")

        summary = {
            "employee": employee,
            "year": year,
            "total_gross": sum(p.gross_salary for p in payslips),
            "total_net": sum(p.net_salary for p in payslips),
            "total_allowances": sum(p.total_allowances for p in payslips),
            "total_deductions": sum(p.total_deductions for p in payslips),
            "payslips_count": payslips.count(),
            "payslips": payslips,
        }

        return summary


# Utility functions that can be used in management commands or views
def create_current_month_period():
    """Create payroll period for current month"""
    now = timezone.now()
    return PayrollProcessor.create_monthly_period(now.year, now.month)


def process_monthly_payroll(year=None, month=None, employee_ids=None):
    """
    Complete monthly payroll processing
    """
    if not year or not month:
        now = timezone.now()
        year = year or now.year
        month = month or now.month

    # Create period
    period, created = PayrollProcessor.create_monthly_period(year, month)

    # Generate payslips
    payslips = PayrollProcessor.generate_payslips_for_period(period, employee_ids)

    return {
        "period": period,
        "period_created": created,
        "payslips_generated": len(payslips),
        "payslips": payslips,
    }
