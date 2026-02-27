import React,{useState}from "react";
import facultylogo from './assets/facultylogo.png'
export default function SignIn(){
    const [email,setEmail]=useState('')
    const [password,setPassword]=useState('')
    const handleSubmit=(e)=>{
        e.preventDefault()
        router.replace('/home')
    };
    
}
    const style={
        logo : {
            width: '100px', 
            height: 'auto',
            marginBottom: '10px'
        },
        page : {
            display: 'flex',
        }
    };