"use client";

import {useToast} from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const {toasts} = useToast();

  return (
    <ToastProvider>
      {toasts.map(({id, title, description, action, ...props}) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
// "use client"

// import { useToast } from "@/hooks/use-toast"
// import {
//   Toast,
//   ToastClose,
//   ToastDescription,
//   ToastProvider,
//   ToastTitle,
//   ToastViewport,
// } from "@/components/ui/toast"
// import { useEffect } from "react"

// export function Toaster() {
//   // const [currentToasts, setCurrentToasts] = useState<ToasterToast[]>([])
//   // const myToast: ToasterToast = {id:"646get2", title:"A new toast", description:"Some description", variant:"destructive"}
//   const { toasts } = useToast()

//   // useEffect(()=>{
//   //   console.log("Toasts changed with toasts : ", toasts)
//   //   setCurrentToasts(toasts)
//   // }, [toasts])

//   return (
//     <ToastProvider>
//       {toasts.map(({ id, title, description, action, ...props }) => (
//           <>
//           <div className="bg-red-600 h-24">
//             Here's the toast
//           </div>
//           <Toast key={id} {...props}>
//             <div className="grid gap-1">
//               {title && <ToastTitle>{title}</ToastTitle>}
//               {description && (
//                 <ToastDescription>{description}</ToastDescription>
//               )}
//             </div>
//             {action}
//             <ToastClose />
//           </Toast>
//           </>
//         )
//       )}
//       <ToastViewport />
//     </ToastProvider>
//   )
// }
