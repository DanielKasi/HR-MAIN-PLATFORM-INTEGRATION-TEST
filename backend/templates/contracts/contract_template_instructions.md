Contract Template Instructions
This guide explains how to create and format contract templates for job positions in the HR system. Templates can be specific to individual job positions, shared across multiple job positions, or set as an institution-wide default.
1. Creating a Template
You have three options to create a contract template:

Upload a PDF or DOCX File: Upload a file containing the contract text. The system will extract the text and convert it into an editable rich text template.
Use CKEditor (Rich Text): Type or paste the contract content directly into the rich text editor. Use the formatting tools to style the text as needed.
Use the Default Template: If no template is assigned to a job position or institution, the system will use the default template stored in the templates folder.

2. Assigning Templates

Institution-Wide Template: Create a template and mark it as the default for the institution (check the "Is Default" box). This template will be used for any job position without a specific template.
Job-Specific Template: Assign a template to one or more job positions using the "Job Positions" field in the template admin form. Leave this field blank for an institution-wide template.
No Template Assigned: If a job position has no specific template and no institution default is set, the system will use the default template (default_contract.html).

3. Formatting Placeholders
Use placeholders in the format {{variable_name}} to insert dynamic data into the contract. These placeholders will be replaced with actual values when generating a contract. Available placeholders include:

{{employee_name}} → Employee's full name
{{position_title}} → Job position name
{{start_date}} → Employment start date
{{salary}} → Employee's salary
{{currency}} → Currency code (defaults to "UGX")
{{institution_name}} → Name of the institution
{{institution_address}} → Institution's address
{{department_name}} → Department name
{{contract_id}} → Unique contract identifier
{{employee_address}} → Employee's address
{{employee_country}} → Employee's country
{{work_type}} → Employment type (e.g., full-time, part-time)
{{probation_period}} → Probation period duration (defaults to "3 months")
{{probation_notice_period}} → Notice period during probation (defaults to "2 weeks")
{{notice_period}} → Notice period for termination (defaults to "30 days")
{{additional_benefits}} → Additional benefits (defaults to "Other benefits as outlined in the Employee Handbook.")
{{employer_representative_name}} → Employer's representative name (defaults to "Authorized Signatory")
{{employer_representative_title}} → Representative's title (defaults to "Manager")
{{signing_date}} → Date of signing

Example Template
<h1>Employment Contract</h1>
<p>Contract ID: {{contract_id}}</p>
<p>This agreement is made between {{employee_name}} and {{institution_name}}.</p>
<p>Position: {{position_title}}</p>
<p>Department: {{department_name}}</p>
<p>Start Date: {{start_date}}</p>
<p>Salary: {{salary}} {{currency}}</p>
<p>Signed: ____________________</p>

4. Editing Templates

After Upload: Uploaded PDF or DOCX files are converted to rich text and can be edited using CKEditor.
Rich Text Templates: Templates created or edited in CKEditor can be updated at any time via the admin interface.
Institution Default: Update the institution's default template by editing the template marked as "Is Default" or assigning a new default.

5. Notes

Ensure placeholders are correctly formatted (e.g., {{employee_name}}, not {{employee name}} or <%employee_name%>).
Test templates to verify that placeholders are replaced correctly when generating contracts.
Store the default template (default_contract.html) in the templates/contracts/ folder for system fallback.
Contact the system administrator if you need additional placeholders or encounter issues with file uploads.
