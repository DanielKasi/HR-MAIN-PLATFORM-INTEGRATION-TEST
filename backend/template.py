import pandas as pd
from faker import Faker
import random
import uuid

fake = Faker()
Faker.seed(42)
random.seed(42)

positions = [
    ("Security Coordinator", "Facilities"),
    ("Maintenance Technician", "Facilities"),
    ("Facilities Manager", "Facilities"),
    ("Paralegal", "Legal"),
    ("Compliance Officer", "Legal"),
    ("Legal Counsel", "Legal"),
    ("Technical Support", "Customer Service"),
    ("Support Representative", "Customer Service"),
    ("Customer Service Manager", "Customer Service"),
    ("Product Developer", "Research and Development"),
    ("Research Scientist", "Research and Development"),
    ("R&D Manager", "Research and Development"),
    ("Customer Success Manager", "Sales"),
    ("Sales Representative", "Sales"),
    ("Sales Manager", "Sales"),
    ("Social Media Specialist", "Marketing"),
    ("Content Creator", "Marketing"),
    ("Marketing Manager", "Marketing"),
    ("Administrative Assistant", "Operations"),
    ("Logistics Coordinator", "Operations"),
]

genders = ["Male", "Female", "Other"]
marital_statuses = ["Single", "Married", "Divorced", "Widowed"]
bank_names = ["Equity Bank", "Stanbic", "Centenary", "DFCU", "Absa"]

emails_set = set()
phones_set = set()


def generate_unique_email():
    while True:
        email = fake.unique.email()
        if email not in emails_set:
            emails_set.add(email)
            return email


def generate_unique_10_digit_phone():
    while True:
        phone = "".join(random.choices("0123456789", k=10))
        if phone not in phones_set:
            phones_set.add(phone)
            return phone


data = []

for _ in range(100):
    name = fake.name()
    email = generate_unique_email()
    phone = generate_unique_10_digit_phone()
    emergency_contact_phone = generate_unique_10_digit_phone()
    position, department = random.choice(positions)
    gender = random.choice(genders)
    dob = fake.date_of_birth(minimum_age=22, maximum_age=60).strftime("%Y-%m-%d")
    work_type = "Full-Time"
    employee_type = "Permanent"
    doj = fake.date_between(start_date="-10y", end_date="today").strftime("%Y-%m-%d")
    address = fake.address().replace("\n", ", ")
    country = fake.country()
    nin = str(uuid.uuid4())[:16]
    bank = random.choice(bank_names)
    bank_account_number = fake.bban()
    experience = f"{random.randint(1, 30)} years"
    qualifications = random.choice(
        ["Bachelor's Degree", "Master's Degree", "Diploma", "PhD"]
    )
    skills = ", ".join(fake.words(nb=random.randint(3, 6)))
    emergency_contact_name = fake.name()
    emergency_contact_relationship = random.choice(
        ["Spouse", "Sibling", "Parent", "Friend"]
    )
    marital_status = random.choice(marital_statuses)
    children_count = random.randint(0, 5)

    data.append(
        {
            "user.fullname": name,
            "user.email": email,
            "phone_number": phone,
            "position": position,
            "gender": gender,
            "department": department,
            "date_of_birth": dob,
            "work_type": work_type,
            "employee_type": employee_type,
            "date_of_joining": doj,
            "address": address,
            "country": country,
            "nin": nin,
            "bank": bank,
            "bank_account_number": bank_account_number,
            "experience": experience,
            "qualifications": qualifications,
            "skills": skills,
            "emergency_contact_name": emergency_contact_name,
            "emergency_contact_phone": emergency_contact_phone,
            "emergency_contact_relationship": emergency_contact_relationship,
            "marital_status": marital_status,
            "children_count": children_count,
        }
    )

# Convert to DataFrame
df = pd.DataFrame(data)

# Export to Excel
df.to_excel("employee_data.xlsx", index=False)

