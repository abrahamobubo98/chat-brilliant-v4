/**
 * Mock implementations of Convex hooks for development purposes
 */

// Define generic types to replace 'any'
type FunctionReference = {
  _internalName: string;
  [key: string]: unknown;
};

type ArgsType = Record<string, unknown>;

// Mock useMutation hook
export function useMutation(functionReference: FunctionReference) {
  return async (args: ArgsType) => {
    console.log(`Mock mutation called: ${functionReference._internalName}`, args);
    // Return a mock successful result
    return { success: true, id: "mock-id-" + Math.random().toString(36).substring(2, 9) };
  };
}

// Mock useQuery hook
export function useQuery(functionReference: FunctionReference, args?: ArgsType) {
  console.log(`Mock query called: ${functionReference._internalName}`, args);
  return null; // Default return value
}

// Mock useAction hook
export function useAction(functionReference: FunctionReference) {
  return async (args: ArgsType) => {
    console.log(`Mock action called: ${functionReference._internalName}`, args);
    return { success: true };
  };
} 