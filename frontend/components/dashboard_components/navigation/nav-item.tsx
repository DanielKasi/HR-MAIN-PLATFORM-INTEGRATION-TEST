import { ChevronDown, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { selectSideBarOpened } from "@/store/miscellaneous/selectors";
import { NavItem } from "@/types";


export const NavItemComponent = ({
	item,
	isMobileView = false,
	index,
	expandedItems,
	onExpand,
	onToggle,
}: {

	item: NavIte;
	expandedItems: { [key: string]: boolean };
	isMobileView: boolean;
	index: number;
	onExpand: (item_title: string) => void;
	onToggle: () => void;
}) => {
	const pathname = usePathname();
	const isActive = item.submenu
		? item.submenu.some((sub) => pathname === sub.href)
		: pathname === item.href;
	const isExpanded = expandedItems[item.title];
	const hoveredTooltipRef = useRef<HTMLSpanElement | null>(null);
	const [isTooltipVisible, setIsTooltipVisible] = useState(false);
	const isSideBarOpen = useSelector(selectSideBarOpened);
	const isMobile = useMobile();
	const router = useRouter();

	return (
		<div key={`${item.title}-${index}`} className="w-full py-1">
			<Button
				disabled={!item.href || (item.href.startsWith("#") && !item.submenu?.length)}
				variant="ghost"
				className={`w-full !rounded-xl flex items-center justify-between px-2 !py-6 text-sm font-medium text-gray-600 hover:bg-primary/80 ${isActive ? "bg-primary/80 text-gray-100" : "hover:bg-opacity-30"
					}`}
				onMouseEnter={() => {
					if (!isSideBarOpen && !isMobile) setIsTooltipVisible(true);
				}}
				onMouseLeave={() => setIsTooltipVisible(false)}
				onClick={() => {
					if (item.submenu) {
						onExpand(item.title);
						!isSideBarOpen && onToggle();
					} else {
						router.push(item.href);
						if (isMobileView) {
							onToggle();
						}
					}
				}}
			>
				<div className="flex items-center space-x-2 relative">
					{item.icon}
					{isSideBarOpen ? <span className="truncate">{item.title}</span> : <></>}

					{/* Tooltip shown only on hover when sidebar is closed and not mobile */}
					{/* {!isSideBarOpen && !isMobile && isTooltipVisible && (
              <span
                ref={hoveredTooltipRef}
                role="tooltip"
                className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[9999] pointer-events-none bg-gray-800 text-white text-xs font-medium rounded-sm px-3 py-1 whitespace-nowrap shadow-lg"
              >
                {item.title}
              </span>
            )} */}
				</div>
				{isSideBarOpen ? (
					item.submenu &&
					(isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)
				) : (
					<></>
				)}
			</Button>
			{item.submenu && isExpanded && (
				<div className="ml-6 flex flex-col mt-2 border-l-2 border-primary/20 bg-gray-200/20">
					{isSideBarOpen &&
						item.submenu.map((sub, index) => (
							<Button
								key={`${sub.href}-${index}`}
								variant="ghost"
								// disabled={!sub.href || sub.href.startsWith("#")}
								className={`w-full !rounded-none !text-left flex items-center px-2 !py-4 text-sm text-gray-600 hover:bg-primary/80 ${!sub.href || sub.href.startsWith("#")
									? " text-gray-500/80"
									: pathname === sub.href
										? "bg-primary/80  text-gray-100"
										: "bg-gray-200/20  hover:bg-primary/60"
									}`}
								onClick={() => {
									router.push(sub.href);
									if (isMobileView) {
										onToggle();
									}
								}}
							>
								<span className="!w-full !text-left !bg-transparent truncate">{sub.title}</span>
							</Button>
						))}
				</div>
			)}
		</div>
	);
};
