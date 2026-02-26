import React, { useContext, useState, useEffect } from "react";
import { auth } from "../../firebase/firebase";
 import { GoogleAuthProvider } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
const AuthContext = React.createContext();
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
   const [user, setUser] = useState(null);
   const[isAuthenticated,setIsAuthenticated]=useState(undefined);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [isEmailUser, setIsEmailUser] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsAuthenticated(true);
    }, 3000);
    const unsubscribe = onAuthStateChanged(auth, initializeUser);
    return unsubscribe;
  }, []);
const login=async(Email,password)=>{
try{

}
catch (e){

}
}
const logout=async(Email,password)=>{
try{

}
catch (e){
  
}
}
const register =async(Emai,password)=>{
try{

}
catch (e){
  
}
}
  async function initializeUser(user) {
    if (user) {

      setCurrentUser({ ...user });

      // check if provider is email and password login
      const isEmail = user.providerData.some(
        (provider) => provider.providerId === "password"
      );
      setIsEmailUser(isEmail);

    
       const isGoogle = user.providerData.some(
       (provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID
     );
     setIsGoogleUser(isGoogle);

      setUserLoggedIn(true);
    } else {
      setCurrentUser(null);
      setUserLoggedIn(false);
    }

    setLoading(false);
  }

  const value = {
    userLoggedIn,
    isEmailUser,
    isGoogleUser,
    currentUser,
    setCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}