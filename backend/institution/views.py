# performance/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from employees.models import Employee, Department

class PerformancePolicy(models.Model):
    """Performance management policies and procedures"""
    title = models.CharField(max_length=255)
    description = models.TextField()
    policy_document = models.FileField(upload_to='performance/policies/')
    version = models.CharField(max_length=20, default='1.0')
    effective_date = models.DateField()
    review_date = models.DateField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-effective_date']

    def __str__(self):
        return f"{self.title} v{self.version}"

class AppraisalTool(models.Model):
    """Different types of appraisal tools"""
    TOOL_TYPES = [
        ('360_feedback', '360 Degree Feedback'),
        ('self_assessment', 'Self Assessment'),
        ('supervisor_review', 'Supervisor Review'),
        ('peer_review', 'Peer Review'),
        ('customer_feedback', 'Customer Feedback'),
        ('kpi_based', 'KPI Based'),
    ]
    
    name = models.CharField(max_length=200)
    tool_type = models.CharField(max_length=50, choices=TOOL_TYPES)
    description = models.TextField()
    instructions = models.TextField()
    template = models.JSONField(default=dict)  # Store tool questions/structure
    weight_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class PerformanceCycle(models.Model):
    """Performance management cycles (annual, semi-annual, quarterly)"""
    CYCLE_TYPES = [
        ('annual', 'Annual'),
        ('semi_annual', 'Semi-Annual'),
        ('quarterly', 'Quarterly'),
        ('monthly', 'Monthly'),
    ]
    
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('review', 'Under Review'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    name = models.CharField(max_length=200)
    cycle_type = models.CharField(max_length=20, choices=CYCLE_TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    goal_setting_deadline = models.DateField()
    mid_review_date = models.DateField(null=True, blank=True)
    final_review_deadline = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    departments = models.ManyToManyField(Department, blank=True)
    appraisal_tools = models.ManyToManyField(AppraisalTool)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.name} ({self.start_date} - {self.end_date})"

class KeyPerformanceIndicator(models.Model):
    """KPIs for different roles and departments"""
    KPI_TYPES = [
        ('quantitative', 'Quantitative'),
        ('qualitative', 'Qualitative'),
        ('behavioral', 'Behavioral'),
    ]
    
    MEASUREMENT_UNITS = [
        ('percentage', 'Percentage'),
        ('number', 'Number'),
        ('currency', 'Currency'),
        ('rating', 'Rating (1-5)'),
        ('yes_no', 'Yes/No'),
        ('text', 'Text Description'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField()
    kpi_type = models.CharField(max_length=20, choices=KPI_TYPES)
    measurement_unit = models.CharField(max_length=20, choices=MEASUREMENT_UNITS)
    target_value = models.CharField(max_length=100)  # Flexible to store different types
    weight_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)
    job_positions = models.ManyToManyField('employees.JobPosition', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class GoalSetting(models.Model):
    """Individual goals for employees"""
    GOAL_TYPES = [
        ('performance', 'Performance Goal'),
        ('development', 'Development Goal'),
        ('behavioral', 'Behavioral Goal'),
        ('project', 'Project Goal'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    performance_cycle = models.ForeignKey(PerformanceCycle, on_delete=models.CASCADE)
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    success_criteria = models.TextField()
    target_date = models.DateField()
    weight_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=25.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    supervisor_comments = models.TextField(blank=True)
    employee_comments = models.TextField(blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee} - {self.title}"

class PerformanceAppraisal(models.Model):
    """Main performance appraisal records"""
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('self_assessment', 'Self Assessment'),
        ('supervisor_review', 'Supervisor Review'),
        ('calibration', 'Calibration'),
        ('completed', 'Completed'),
        ('appealed', 'Appealed'),
    ]
    
    OVERALL_RATINGS = [
        ('exceeds', 'Exceeds Expectations'),
        ('meets', 'Meets Expectations'),
        ('partially_meets', 'Partially Meets Expectations'),
        ('below', 'Below Expectations'),
        ('unsatisfactory', 'Unsatisfactory'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    performance_cycle = models.ForeignKey(PerformanceCycle, on_delete=models.CASCADE)
    supervisor = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='supervised_appraisals')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    self_assessment_date = models.DateTimeField(null=True, blank=True)
    supervisor_review_date = models.DateTimeField(null=True, blank=True)
    final_review_date = models.DateTimeField(null=True, blank=True)
    overall_rating = models.CharField(max_length=20, choices=OVERALL_RATINGS, null=True, blank=True)
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    strengths = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)
    development_plan = models.TextField(blank=True)
    employee_acknowledgment = models.BooleanField(default=False)
    employee_acknowledgment_date = models.DateTimeField(null=True, blank=True)
    employee_comments = models.TextField(blank=True)
    calibration_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['employee', 'performance_cycle']

    def __str__(self):
        return f"{self.employee} - {self.performance_cycle.name}"

class PerformanceReview(models.Model):
    """Detailed review entries for each appraisal tool"""
    appraisal = models.ForeignKey(PerformanceAppraisal, on_delete=models.CASCADE, related_name='reviews')
    appraisal_tool = models.ForeignKey(AppraisalTool, on_delete=models.CASCADE)
    reviewer = models.ForeignKey(Employee, on_delete=models.CASCADE)
    responses = models.JSONField(default=dict)  # Store responses to tool questions
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    comments = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.appraisal} - {self.appraisal_tool.name}"

class KPIScore(models.Model):
    """Individual KPI scores for employees"""
    appraisal = models.ForeignKey(PerformanceAppraisal, on_delete=models.CASCADE, related_name='kpi_scores')
    kpi = models.ForeignKey(KeyPerformanceIndicator, on_delete=models.CASCADE)
    target_value = models.CharField(max_length=100)
    actual_value = models.CharField(max_length=100)
    score = models.DecimalField(max_digits=5, decimal_places=2)
    comments = models.TextField(blank=True)
    evidence = models.FileField(upload_to='performance/evidence/', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.appraisal} - {self.kpi.name}"

class PerformanceReport(models.Model):
    """Generated performance reports"""
    REPORT_TYPES = [
        ('individual', 'Individual Performance'),
        ('department', 'Department Performance'),
        ('cycle_summary', 'Cycle Summary'),
        ('calibration', 'Calibration Report'),
        ('analytics', 'Performance Analytics'),
    ]
    
    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    performance_cycle = models.ForeignKey(PerformanceCycle, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)
    generated_by = models.ForeignKey(User, on_delete=models.CASCADE)
    report_data = models.JSONField(default=dict)
    report_file = models.FileField(upload_to='performance/reports/', blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class PerformanceDevelopmentPlan(models.Model):
    """Development plans arising from performance reviews"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    appraisal = models.OneToOneField(PerformanceAppraisal, on_delete=models.CASCADE)
    development_areas = models.TextField()
    action_items = models.JSONField(default=list)  # List of development actions
    timeline = models.TextField()
    resources_needed = models.TextField(blank=True)
    success_metrics = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    follow_up_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Development Plan - {self.appraisal.employee}"
