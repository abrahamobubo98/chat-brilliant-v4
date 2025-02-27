import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SignInFlow } from "../types";
import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

interface SignUpCardProps {
        setState: (state: SignInFlow) => void;
};

export const SignUpCard = ({ setState }: SignUpCardProps) => {

    const{ signIn } = useAuthActions();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    const onPasswordSignUp = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setPending(true);
        signIn("password", { name, email, password, flow: "signUp" })
        .catch((error) => {
            setError("Something went wrong. Is your password 8 characters long?");
        })
        .finally(() => {
            setPending(false);
        });
    }

    const onProviderSignUp = (value: "github" | "google") => {
        setPending(true);
        signIn(value)
            .finally(() => {
                setPending(false)}
            );
    };

    return (
        
        <Card className="w-[500px] rounded-lg p-8">
            <CardHeader className="px-0 pt-0">
                <CardTitle>Welcome to ChatBrilliant!!</CardTitle>
                <CardDescription>
                Sign up to continue
            </CardDescription>
            </CardHeader>
            {!!error && (
                <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
                    <TriangleAlert className="size-4"/>
                    <p>{error}</p>
                </div>
                )
            }
            <CardContent className="space-y-5 px-0 pb-0">
                <form onSubmit={onPasswordSignUp} className="space-y-5">
                    <Input
                    disabled={pending}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="UserName"
                    required
                    />
                    <Input
                    disabled={pending}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    required
                    />
                    <Input
                    disabled={pending}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    type="password"
                    required
                    />
                    <Input
                    disabled={pending}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    type="password"
                    required
                    />
                    <Button type="submit" className="w-full" size="lg" disabled={pending}>
                        Continue
                    </Button>
                </form>
                <Separator />
                <div className="flex flex-col gap-y-2.5">
                    <Button 
                    className="w-full relative"
                    onClick={() => onProviderSignUp("google")}
                    >
                        <FcGoogle className="size-5 absolute top-3 left-2.5"/>
                        Continue with Google
                    </Button>
                    <Button 
                    className="w-full relative"
                    onClick={() => onProviderSignUp("github")}
                    >
                        <FaGithub className="size-5 absolute top-3 left-2.5"/>
                        Continue with Github
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Already have an account? <span onClick={() => setState("signIn")} className="text-sky-700 hover:underline cursor-pointer">Sign In</span>
                </p>
            </CardContent>
        </Card>
    );
};