import {useEffect, useState} from "react";
import {useSelector} from "react-redux";

import {IPermission, Role} from "@/app/types";
import {PERMISSION_CODES} from "@/app/types/types.utils";
import {selectSelectedInstitution, selectTemporaryPermissions, selectUser} from "@/store/auth/selectors";

export function usePermission(permissionCode: PERMISSION_CODES) {
  const currentUser = useSelector(selectUser);
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const temporaryPermissions = useSelector(selectTemporaryPermissions);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    try {
      if (!currentUser) {
        setHasPermission(false);

        return;
      }
      const userId = currentUser.id;

      // Check if user is the Institution owner
      if (selectedInstitution) {
        // If user is the Institution owner, grant all permissions
        if (selectedInstitution.institution_owner_id === userId) {
          setHasPermission(true);
        }
      }

      // Check temporary permissions first
      const hasTemporaryPermission = temporaryPermissions.some(
        (permission: IPermission) => permission.permission_code === permissionCode,
      );

      if (hasTemporaryPermission) {
        setHasPermission(true);
      }

      // Otherwise, check user's own permissions
      setHasPermission(
        currentUser.roles?.some((role: Role) =>
          role.permissions_details?.some(
            (permission: any) => permission.permission_code === permissionCode,
          ),
        ) || false,
      );
    } catch (error) {
      console.error("Error checking permission:", error);
      setHasPermission(false);
    }
  }, [currentUser, selectedInstitution, temporaryPermissions]);

  return hasPermission;
}
