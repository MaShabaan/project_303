import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";

export default function AddCourse() {

const [courseName,setCourseName] = useState("");
const [instructor,setInstructor] = useState("");

const handleAddCourse = () => {

if(!courseName || !instructor){
Alert.alert("Error","Please fill all fields");
return;
}

Alert.alert("Success","Course Added Successfully");

router.push({
  pathname: "./courses",
  params: {
    name: courseName,
    instructor: instructor,
  },
});

};

return(

<View style={styles.container}>

<Text style={styles.title}>Add New Course</Text>

<TextInput
placeholder="Course Name"
value={courseName}
onChangeText={setCourseName}
style={styles.input}
/>

<TextInput
placeholder="Instructor Name"
value={instructor}
onChangeText={setInstructor}
style={styles.input}
/>

<TouchableOpacity style={styles.button} onPress={handleAddCourse}>
<Text style={styles.buttonText}>Add Course</Text>
</TouchableOpacity>

</View>

);

}

const styles = StyleSheet.create({

container:{
flex:1,
padding:20,
backgroundColor:"#fff"
},

title:{
fontSize:24,
fontWeight:"bold",
marginBottom:20
},

input:{
borderWidth:1,
borderColor:"#ddd",
padding:12,
borderRadius:8,
marginBottom:15
},

button:{
backgroundColor:"#667eea",
padding:14,
borderRadius:10,
alignItems:"center"
},

buttonText:{
color:"#fff",
fontWeight:"bold",
fontSize:16
}

});