/**
 * Mock implementations of Convex hooks for development purposes
 */

// Mock useMutation hook
export function useMutation(functionReference: any) {
  return async (args: any) => {
    console.log(`Mock mutation called: ${functionReference._internalName}`, args);
    // Return a mock successful result
    return { success: true, id: "mock-id-" + Math.random().toString(36).substring(2, 9) };
  };
}

// Mock useQuery hook
export function useQuery(functionReference: any, args?: any) {
  console.log(`Mock query called: ${functionReference._internalName}`, args);
  return null; // Default return value
}

// Mock useAction hook
export function useAction(functionReference: any) {
  return async (args: any) => {
    console.log(`Mock action called: ${functionReference._internalName}`, args);
    return { success: true };
  };
} 