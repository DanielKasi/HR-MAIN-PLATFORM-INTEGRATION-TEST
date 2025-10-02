import React from "react";

interface CardSkeletonProps {
	lines?: number;
	avatarCount?: number;
	showProgressBar?: boolean;
	showBadge?: boolean;
	showActions?: boolean;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({
	lines = 3,
	avatarCount = 3,
	showProgressBar = false,
	showBadge = false,
	showActions = true,
}) => {
	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 animate-pulse">
			<div className="flex items-start justify-between">
				<div className="h-6 bg-gray-200 rounded w-3/4"></div>
				{showActions && <div className="h-8 w-8 bg-gray-200 rounded-full"></div>}
			</div>
			{showBadge && <div className="h-4 bg-gray-200 rounded w-20"></div>}
			{showProgressBar && (
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<div className="h-3 bg-gray-200 rounded w-16"></div>
						<div className="h-3 bg-gray-200 rounded w-8"></div>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-2"></div>
				</div>
			)}
			<div className="space-y-1">
				{Array.from({ length: lines }).map((_, i) => (
					<div key={i} className="flex justify-between">
						<div className="h-3 bg-gray-200 rounded w-20"></div>
						<div className="h-3 bg-gray-200 rounded w-20"></div>
					</div>
				))}
			</div>
			<div className="flex justify-between pt-4 border-t border-gray-200">
				<div className="flex items-center gap-2">
					<div className="flex -space-x-1">
						{Array.from({ length: avatarCount }).map((_, i) => (
							<div key={i} className="w-6 h-6 bg-gray-200 rounded-full" />
						))}
					</div>
					<div className="h-3 bg-gray-200 rounded w-16"></div>
				</div>
				<div className="h-3 bg-gray-200 rounded w-16"></div>
			</div>
		</div>
	);
};

export default CardSkeleton;
