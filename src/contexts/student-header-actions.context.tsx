import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export const SetStudentHeaderActionsContext = createContext<
  Dispatch<SetStateAction<ReactNode | null>> | null
>(null);

export function useSetStudentHeaderActions() {
  return useContext(SetStudentHeaderActionsContext);
}
