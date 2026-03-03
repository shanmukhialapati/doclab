import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface DecodedToken {
  role: string;
  [key: string]: any;
}

const API_BASE_URL = "http://192.168.0.236:8080/api/auth";

export default function Index() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    number: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState(1);
  const [resetData, setResetData] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [timer, setTimer] = useState(0);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  const forgotOtpRef = useRef<TextInput>(null);

  const [canResend, setCanResend] = useState(false);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    let interval: number;
    if (timer > 0) {
      setCanResend(false);
      interval = window.setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => window.clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (isVerifyingOtp) setTimeout(() => otpInputRef.current?.focus(), 100);
    if (forgotStep === 2) setTimeout(() => forgotOtpRef.current?.focus(), 100);
  }, [isVerifyingOtp, forgotStep]);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("AccessToken");
      if (token) {
        const decoded = jwtDecode<DecodedToken>(token);
        redirectUser(decoded.role);
      }
    } catch (e) {
      console.log("Error checking login status", e);
    } finally {
      setIsLoading(false);
    }
  };

  const redirectUser = (role: string) => {
    if (role === "USER") router.replace("/(patients)/patienthome");
    else if (role === "ADMIN") router.replace("/(superAdmin)/adminhome");
    else if (role === "RECEIPTIOINIST")
      router.replace("/(receptionist)/receptionisthome");
    else router.replace("/(hospital)/hospitalhome");
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email: formData.email,
        password: formData.password,
      });

      if (response.status === 200) {
        const token = response.data.token;
        const decoded = jwtDecode<DecodedToken>(token);

        if (decoded.verified === false) {
          Alert.alert(
            "Verification Required",
            "Please verify your email first.",
          );
          window.alert("Please verify your email first.");

          setIsVerifyingOtp(true);
          return;
        }

        await AsyncStorage.setItem("AccessToken", token);
        redirectUser(decoded.role);
      }
    } catch (error: any) {
      Alert.alert("Login Failed", "Invalid credentials");
      window.alert("Invalid credentials");
    }
  };
  const handleResendSignUpOtp = async () => {
    const currentEmail = isVerifyingOtp ? formData.email : forgotEmail;
    if (!canResend) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/resend-otp?email=${currentEmail}`,
        {
          username: formData.name,
          email: formData.email,
          phnno: formData.number,
          password: formData.password,
          role: "USER",
        },
      );

      if (response.status === 200 || response.status === 201) {
        setTimer(60);
        setCanResend(false);
        if (!isVerifyingOtp && !showForgotModal) {
          setIsVerifyingOtp(true);
        }
        Alert.alert("Success", "A new OTP has been sent to your email.");
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to resend OTP. Please try again later.");
    }
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert("Error", "Please fill required fields");
      window.alert("Please fill required fields");
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/signup`, {
        username: formData.name,
        email: formData.email,
        phnno: formData.number,
        password: formData.password,
        role: "USER",
      });
      if (response.status === 201 || response.status === 200) {
        setIsVerifyingOtp(true);
        setTimer(60);
        setCanResend(false);
      }
    } catch (error: any) {
      Alert.alert("Error", "Registration failed");
      window.alert("Registration failed");
    }
  };

  const handleVerifyOtp = async () => {
    const BASE_URL = "http://192.168.0.236:8080";

    const currentEmail = isVerifyingOtp ? formData.email : forgotEmail;
    const currentOtp = isVerifyingOtp ? formData.otp : resetData.otp;

    try {
      if (!currentOtp) return Alert.alert("Error", "Please enter OTP");

      const response = await axios.post(
        `${BASE_URL}/api/auth/verify-otp?otp=${currentOtp}`,
        {
          email: currentEmail,
          otp: currentOtp,
        },
      );

      if (response.status === 200) {
        if (isVerifyingOtp) {
          Alert.alert(
            "Success",
            "Account verified successfully! You can now login.",
          );
          setIsVerifyingOtp(false);
          setIsRegistering(false);

          setFormData((prev) => ({
            ...prev,
            otp: "",
          }));
        } else {
          setIsOtpVerified(true);
          Alert.alert("Success", "OTP Verified! Please set your new password.");
        }
      }
    } catch (error: any) {
      console.error("OTP Verification Error:", error.response?.data);
      const errorMsg =
        error.response?.data?.message || "Invalid or expired OTP";
      Alert.alert("Verification Failed", errorMsg);
    }
  };

  const handleForgotPasswordRequest = async () => {
    if (!forgotEmail) {
      const msg = "Please enter your email address";
      return isWeb ? window.alert(msg) : Alert.alert("Error", msg);
    }

    try {
      const response = await axios.post(
        `http://192.168.0.236:8080/auth/forgot-password?email=${forgotEmail}`,
      );

      if (response.status === 200) {
        setForgotStep(2);
        setTimer(60);
        const successMsg = "OTP sent to your email!";
        isWeb ? window.alert(successMsg) : Alert.alert("Success", successMsg);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || "User not found or server error";
      isWeb ? window.alert(errorMsg) : Alert.alert("Error", errorMsg);
      console.error("Forgot Password Error:", error);
    }
  };
  const handleResetPasswordSubmit = async () => {
    const BASE_URL = "http://192.168.0.236:8080";

    try {
      if (!isOtpVerified) {
        if (!resetData.otp) return Alert.alert("Error", "Please enter OTP");

        const response = await axios.post(
          `${BASE_URL}/api/auth/verify-otp?otp=${resetData.otp}`,
          {
            email: forgotEmail,
            otp: resetData.otp,
          },
        );

        if (response.status === 200) {
          setIsOtpVerified(true);
          Alert.alert("Success", "OTP Verified! Set your new password.");
        }
        return;
      }

      if (!resetData.newPassword || !resetData.confirmPassword) {
        return Alert.alert("Error", "Please fill all fields");
      }

      if (resetData.newPassword !== resetData.confirmPassword) {
        return Alert.alert("Error", "Passwords do not match");
      }

      const url = `${BASE_URL}/auth/reset-password?email=${encodeURIComponent(
        forgotEmail,
      )}&newPassword=${encodeURIComponent(
        resetData.newPassword,
      )}&confirmPassword=${encodeURIComponent(resetData.confirmPassword)}`;

      const response = await axios.post(url);

      if (response.status === 200) {
        Alert.alert("Success", "Password reset successfully!");
        setShowForgotModal(false);
        setForgotStep(1);
        setIsOtpVerified(false);
        setResetData({ otp: "", newPassword: "", confirmPassword: "" });
      }
    } catch (error: any) {
      console.error("Submit Error:", error.response?.data);
      const errorMsg =
        error.response?.data?.message || "Action failed. Check OTP/Connection.";
      Alert.alert("Error", errorMsg);
    }
  };
  if (isLoading) return null;

  return (
    <LinearGradient
      colors={["rgba(177, 235, 252, 0.86)", "rgba(90, 250, 215, 0.86)"]}
      className="flex-1 items-center justify-center"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 items-center justify-center p-4"
      >
        <View
          className={`${
            isWeb
              ? "bg-white w-[1000px] min-h-[550px] flex-row rounded-2xl"
              : "w-full bg-white rounded-xl p-5"
          }`}
        >
          <View
            className={`${
              isWeb
                ? "h-[500px] w-[500px] p-8 ml-8"
                : "h-[200px] w-full m-5 bg-white rounded-t-2xl items-center"
            }`}
          >
            <ImageBackground
              source={{
                uri: "https://vedantahealthcare.com/wp-content/uploads/2024/06/meet-our-doctors-heading-image.jpg",
              }}
              resizeMode="cover"
              className={`${
                isWeb
                  ? "flex-1 rounded-2xl"
                  : "h-full w-[200px] p-2 rounded-2xl"
              }`}
            />
          </View>

          <View
            className={`${
              isWeb
                ? "w-1/2 flex-1 justify-center items-center"
                : "bg-white rounded-b-2xl items-center"
            }`}
          >
            <View
              className={`${
                isWeb
                  ? "w-[350px] p-8 m-8 border border-black/10 rounded-[30px] shadow-lg"
                  : "w-[90%] p-2 mb-4 border border-black/10 rounded-2xl"
              }`}
            >
              <Text
                className={`${
                  isWeb
                    ? "text-2xl italic font-bold mb-6 text-center uppercase tracking-widest"
                    : "text-xl italic font-bold mb-4 text-center uppercase tracking-widest"
                }`}
              >
                {isVerifyingOtp
                  ? "Verify OTP"
                  : isRegistering
                    ? "Register"
                    : "Login"}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {isVerifyingOtp ? (
                  <View>
                    <InputField
                      innerRef={otpInputRef}
                      icon="lock"
                      placeholder="Enter 6-digit OTP"
                      value={formData.otp}
                      onChange={(t: string) =>
                        setFormData({ ...formData, otp: t })
                      }
                    />

                    <View className="flex-row justify-between items-center mb-4 px-1">
                      <Text className="text-xs text-gray-500">
                        Didn't receive code?
                      </Text>
                      {timer > 0 ? (
                        <Text className="text-xs text-gray-400 italic">
                          Resend in {timer}s
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleResendSignUpOtp}>
                          <Text className="text-xs font-bold text-[#2eb8b8]">
                            RESEND OTP
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={handleVerifyOtp}
                      className="bg-[#2eb8b8] p-3 rounded-xl items-center"
                    >
                      <Text className="text-white font-bold">VERIFY</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {isRegistering && (
                      <>
                        <InputField
                          icon="user"
                          placeholder="Full Name"
                          value={formData.name}
                          onChange={(t: any) =>
                            setFormData({ ...formData, name: t })
                          }
                        />
                        <InputField
                          icon="phone"
                          placeholder="Mobile Number"
                          value={formData.number}
                          onChange={(t: any) =>
                            setFormData({ ...formData, number: t })
                          }
                          keyboardType="phone-pad"
                        />
                      </>
                    )}

                    <InputField
                      icon="envelope"
                      placeholder="Email"
                      value={formData.email}
                      onChange={(t: any) =>
                        setFormData({ ...formData, email: t })
                      }
                      keyboardType="email-address"
                    />
                    <InputField
                      icon="lock"
                      placeholder="Password"
                      value={formData.password}
                      onChange={(t: any) =>
                        setFormData({ ...formData, password: t })
                      }
                      secure
                    />

                    {isRegistering && (
                      <InputField
                        icon="lock"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={(t: any) =>
                          setFormData({ ...formData, confirmPassword: t })
                        }
                        secure
                      />
                    )}
                    <TouchableOpacity
                      onPress={isRegistering ? handleRegister : handleLogin}
                      className="bg-[#2eb8b8] p-3 rounded-xl items-center mt-4"
                    >
                      <Text className="text-white font-bold">
                        {isRegistering ? "SIGN UP" : "LOGIN"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View className="flex-row justify-between mt-4 px-2">
                  {!isRegistering && (
                    <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                      <Text className="text-xs text-sky-600">
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      setIsRegistering(!isRegistering);
                      setIsVerifyingOtp(false);
                    }}
                  >
                    <Text className="text-xs font-bold">
                      {isRegistering ? "Back to Login" : "Register Now"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={showForgotModal} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-3xl w-[90%] max-w-[400px]">
            {forgotStep === 1 ? (
              <>
                <Text className="text-xl font-bold mb-4">Reset Password</Text>
                <InputField
                  icon="envelope"
                  placeholder="Email Address"
                  value={forgotEmail}
                  onChange={setForgotEmail}
                />
                <TouchableOpacity
                  onPress={handleForgotPasswordRequest}
                  className="bg-[#2eb8b8] p-3 rounded-xl items-center"
                >
                  <Text className="text-white font-bold">SEND OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text className="text-xl font-bold mb-2">
                  {isOtpVerified ? "Create New Password" : "Enter Reset OTP"}
                </Text>

                {!isOtpVerified && (
                  <InputField
                    innerRef={forgotOtpRef}
                    icon="lock"
                    placeholder="6-digit OTP"
                    value={resetData.otp}
                    onChange={(t: string) =>
                      setResetData({ ...resetData, otp: t })
                    }
                  />
                )}

                {isOtpVerified && (
                  <>
                    <InputField
                      icon="envelope"
                      placeholder="Email"
                      value={forgotEmail}
                      onChange={(t: any) =>
                        setFormData({ ...formData, email: t })
                      }
                      keyboardType="email-address"
                    />
                    <InputField
                      icon="key"
                      placeholder="New Password"
                      secure
                      value={resetData.newPassword}
                      onChange={(t: string) =>
                        setResetData({ ...resetData, newPassword: t })
                      }
                    />
                    <InputField
                      icon="check-circle"
                      placeholder="Confirm Password"
                      secure
                      value={resetData.confirmPassword}
                      onChange={(t: string) =>
                        setResetData({ ...resetData, confirmPassword: t })
                      }
                    />
                  </>
                )}

                <View className="flex-row justify-between items-center mt-4">
                  {!isOtpVerified && (
                    <View className="flex-1">
                      {timer > 0 ? (
                        <Text className="text-gray-400 text-xs italic">
                          Resend in {timer}s
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleForgotPasswordRequest}>
                          <Text className="text-sky-600 font-bold text-xs">
                            RESEND OTP
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleResetPasswordSubmit}
                    className={`bg-[#2eb8b8] px-6 py-3 rounded-xl ${
                      isOtpVerified ? "flex-1" : "ml-4"
                    }`}
                  >
                    <Text className="text-white font-bold text-center">
                      {isOtpVerified ? "UPDATE PASSWORD" : "VERIFY OTP"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity
              onPress={() => {
                setShowForgotModal(false);
                setIsOtpVerified(false);

                setResetData({ otp: "", newPassword: "", confirmPassword: "" });
              }}
              className="mt-4 items-center"
            >
              <Text className="text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const InputField = ({
  icon,
  placeholder,
  value,
  onChange,
  secure,
  innerRef,
}: any) => (
  <View className="mb-4 flex-row items-center bg-gray-100 rounded-xl px-3 border border-gray-200 online-none">
    <FontAwesome name={icon} size={18} color="#666" />
    <TextInput
      ref={innerRef}
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      secureTextEntry={secure}
      className="flex-1 p-3 ml-2"
      autoCapitalize="none"
    />
  </View>
);
