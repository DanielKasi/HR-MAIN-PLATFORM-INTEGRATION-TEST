"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import {Bar, Pie} from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DepartmentSalary {
  department__name: string;
  average_salary: number;
}

interface PositionSalary {
  position__name: string;
  average_salary: number;
}

interface SalaryBracket {
  bracket: string;
  count: number;
}

interface SalaryAnalytics {
  average_salary_by_department: DepartmentSalary[];
  average_salary_by_position: PositionSalary[];
  salary_distribution: SalaryBracket[];
  gender_pay_gap: {
    male_average_salary: number;
    female_average_salary: number;
    other_average_salary: number;
  };
}

export default function SalaryCharts({data}: {data: SalaryAnalytics}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* Average Salary by Department */}
      <div className="p-4 bg-white rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-2">Average Salary by Department</h2>
        <Bar
          data={{
            labels: data.average_salary_by_department?.map((d) => d.department__name),
            datasets: [
              {
                label: "Salary",
                data: data.average_salary_by_department?.map((d) => d.average_salary),
                backgroundColor: "rgba(54, 162, 235, 0.6)",
              },
            ],
          }}
          options={{responsive: true}}
        />
      </div>

      {/* Average Salary by Position */}
      <div className="p-4 bg-white rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-2">Average Salary by Position</h2>
        <Bar
          data={{
            labels: data.average_salary_by_position?.map((d) => d.position__name),
            datasets: [
              {
                label: "Salary",
                data: data.average_salary_by_position?.map((d) => d.average_salary),
                backgroundColor: "rgba(255, 159, 64, 0.6)",
              },
            ],
          }}
          options={{
            indexAxis: "y", // horizontal bar
            responsive: true,
          }}
        />
      </div>

      {/* Salary Distribution */}
      <div className="p-4 bg-white rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-2">Salary Distribution</h2>
        <Bar
          data={{
            labels: data.salary_distribution?.map((d) => d.bracket),
            datasets: [
              {
                label: "Employees",
                data: data.salary_distribution?.map((d) => d.count),
                backgroundColor: "rgba(153, 102, 255, 0.6)",
              },
            ],
          }}
          options={{responsive: true}}
        />
      </div>

      {/* Gender Pay Gap */}
      <div className="p-4 bg-white rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-2">Gender Pay Gap</h2>
        <Pie
          data={{
            labels: ["Male", "Female", "Other"],
            datasets: [
              {
                label: "Average Salary",
                data: [
                  data.gender_pay_gap?.male_average_salary,
                  data.gender_pay_gap?.female_average_salary,
                  data.gender_pay_gap?.other_average_salary,
                ],
                backgroundColor: [
                  "rgba(255, 99, 132, 0.6)", // Male
                  "rgba(54, 162, 235, 0.6)", // Female
                  "rgba(255, 206, 86, 0.6)", // Other
                ],
              },
            ],
          }}
        />
      </div>
    </div>
  );
}
