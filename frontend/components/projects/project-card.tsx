import { IProject } from "@/types/types.utils";

interface ProjectCardProps {
	project: IProject;
	className?: string;
}

export const ProjectCard = ({ project, className }: ProjectCardProps) => {
	return (
		<>
			<div className="flex flex-col shadow-sm rounded-2xl p-4">
				<div className="flex items-start justify-between">
					<p></p>
				</div>
			</div>
		</>
	);
};
