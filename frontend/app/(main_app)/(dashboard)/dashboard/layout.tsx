"use client"

import { IEmployee, PERMISSION_CODES } from "@/types/types.utils";
import ProtectedPage from "@/components/ProtectedPage";
import { useSelector } from "react-redux";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import { useEffect, useState } from "react";
import FixedLoader from "@/components/fixed-loader";
import { employeeAPI, showErrorToast } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { hasPermission } from "@/lib/helpers";

export default function DashboardLayout({children}: {children: React.ReactNode}) {

  const currentUser = useSelector(selectUser);
  const currentInstitution = useSelector(selectSelectedInstitution);
  const [relatedEmployee, setRelatedEmployee] = useState<IEmployee|null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  console.log("\n\n\n\n Main dasboard component has mounted !!")

  useEffect(()=>{
    console.log("\n\n\n\n  Effect for fetching related employeed is running !")
    if(currentInstitution && currentUser){
      console.log("\n\n Effect for fetching related employeed is running !")
      if(currentUser.id !== currentInstitution.institution_owner_id && !hasPermission(PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD)){
        fetchRelatedEmployeeByUserId()
      }
    }
  }, 
  [currentInstitution, currentUser])


  useEffect(()=>{
    if(relatedEmployee){
      router.push(`employees/profile/${relatedEmployee.id}`)
    }
  }, [relatedEmployee])

  const fetchRelatedEmployeeByUserId = async () => {
    if(!currentUser){return}
    setLoading(true);
    try {
      const employee = await employeeAPI.getByUserId({user_id:currentUser.id});
      setRelatedEmployee(employee);
    } catch (error) {
      showErrorToast({error, defaultMessage:"Failed to fetch related employee"})
    }finally{
      setLoading(false)
    }
  }


  if(!currentInstitution || !currentUser || loading){
    return <FixedLoader/>
  }

  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD}>{children}</ProtectedPage>
  );
} 