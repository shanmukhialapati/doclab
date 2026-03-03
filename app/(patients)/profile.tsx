import { FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface Appointment {
  id: string;
  doctorName?: string;
  hospitalName?: string;
  doctorId: string;
  appointmentDate: string;
  timeSlot: string;
  status: string;
  issue: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
  );
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  const PATIENT_ID = 1;
  const BASE_URL = "http://192.168.0.186:8081";

  const userData = {
    name: "Shanmukhi",
    email: "shanmukhialapati@gmail.com",
    phone: "+91 9874532345",
    city: "Hyderabad",
  };

  useEffect(() => {
    fetchProfile();
    loadAppointments();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/patient/profile/${PATIENT_ID}`);
      if (res.ok) {
        const data = await res.json();
        if (data.imagePath) {
          const fullImageUrl = data.imagePath.startsWith("http")
            ? data.imagePath
            : `${BASE_URL}/${data.imagePath}`;
          setProfileImage(fullImageUrl);
        }
      }
    } catch (e) {
      console.error("Failed to load profile image", e);
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/patient/appointments/${PATIENT_ID}`,
      );
      if (response.ok) {
        const data = await response.json();

        const enriched = data.map((item: any) => ({
          ...item,
          doctorName: item.doctorName || "Dr. Sarah Johnson",
          hospitalName: item.hospitalName || "City General Hospital",
        }));
        setAppointments(enriched.reverse());
      }
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPress = (appointment: any) => {
    setSelectedAppointment(appointment);
    setModalVisible(true);
  };

  const processRazorpay = async () => {
    setModalVisible(false);

    Alert.alert("Redirecting", "Opening Razorpay...");
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#2eb8b8", "#1a9191"]}
          className="pt-16 pb-20 px-6 rounded-b-[50px] items-center"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-12 left-6 bg-white/20 p-2 rounded-full"
          >
            <FontAwesome name="chevron-left" size={16} color="white" />
          </TouchableOpacity>

          <View className="relative">
            <Image
              source={{ uri: profileImage }}
              className="w-24 h-24 rounded-full border-4 border-white/50"
            />
            <TouchableOpacity className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-sm">
              <MaterialCommunityIcons name="camera" size={16} color="#2eb8b8" />
            </TouchableOpacity>
          </View>

          <Text className="text-white text-2xl font-black mt-4">
            {userData.name}
          </Text>
          <Text className="text-white/80 font-medium">{userData.email}</Text>
        </LinearGradient>

        <View className="flex-row justify-around -mt-10 px-6">
          <StatCard
            icon="calendar-check-o"
            label="Appts"
            value={appointments.length.toString()}
          />
          <StatCard icon="map-marker" label="City" value={userData.city} />
          <StatCard icon="shield" label="Status" value="Verified" />
        </View>

        <View className="px-6 mt-10 pb-20">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-black text-slate-800">
              My Appointments
            </Text>
            <TouchableOpacity onPress={loadAppointments}>
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color="#2eb8b8"
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="py-20">
              <ActivityIndicator size="large" color="#2eb8b8" />
            </View>
          ) : appointments.length > 0 ? (
            appointments.map((item, index) => (
              <AppointmentCard key={index} data={item} onPay={handlePayPress} />
            ))
          ) : (
            <View className="items-center py-20">
              <MaterialCommunityIcons
                name="calendar-blank"
                size={60}
                color="#e2e8f0"
              />
              <Text className="text-slate-400 mt-4 font-bold">
                No appointments yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal animationType="slide" transparent visible={isModalVisible}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[40px] p-8">
            <View className="items-center mb-8">
              <View className="w-12 h-1.5 bg-slate-100 rounded-full mb-6" />
              <Text className="text-2xl font-black text-slate-800">
                Payment Option
              </Text>
              <Text className="text-slate-400 text-center mt-2">
                Choose how you'd like to pay for your appointment with{" "}
                {selectedAppointment?.doctorName}
              </Text>
            </View>

            <PaymentOption
              icon="credit-card"
              color="bg-blue-500"
              title="Razorpay Secure"
              sub="UPI, Cards, Net Banking"
              onPress={processRazorpay}
            />

            <PaymentOption
              icon="hospital-building"
              color="bg-teal-500"
              title="Pay at Hospital"
              sub="Directly at the reception"
              onPress={() => {
                Alert.alert("Success", "Booking confirmed!");
                setModalVisible(false);
              }}
            />

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="mt-4 py-4 items-center"
            >
              <Text className="text-slate-400 font-bold">Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Helper Components
const StatCard = ({ icon, label, value }: any) => (
  <View className="bg-white w-[28%] p-4 rounded-3xl items-center shadow-sm border border-slate-50">
    <FontAwesome name={icon} size={14} color="#2eb8b8" />
    <Text className="text-slate-800 font-bold mt-1 text-xs">{value}</Text>
    <Text className="text-slate-400 text-[9px] uppercase font-black tracking-tighter">
      {label}
    </Text>
  </View>
);

const AppointmentCard = ({ data, onPay }: any) => {
  const status = data.status?.toLowerCase();
  const isApproved = status === "approved";
  const isPaid =
    status === "paid" || status === "success" || status === "created";

  return (
    <View className="bg-white p-5 rounded-[30px] mb-4 border border-slate-100 shadow-sm">
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <Text className="text-lg font-black text-slate-800">
            {data.doctorName}
          </Text>
          <Text className="text-slate-400 font-medium text-xs">
            {data.hospitalName}
          </Text>
        </View>
        <View
          className={`px-4 py-1.5 rounded-full ${
            isPaid ? "bg-green-100" : "bg-cyan-100"
          }`}
        >
          <Text
            className={`text-[10px] font-black uppercase ${
              isPaid ? "text-green-600" : "text-cyan-600"
            }`}
          >
            {data.status}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between border-t border-slate-50 pt-4">
        <View className="flex-row items-center">
          <View className="bg-slate-50 p-2 rounded-full mr-2">
            <FontAwesome name="calendar" size={10} color="#64748b" />
          </View>
          <Text className="text-slate-600 text-xs font-bold">
            {data.appointmentDate}
          </Text>
        </View>

        <View className="flex-row items-center">
          <View className="bg-slate-50 p-2 rounded-full mr-2">
            <FontAwesome name="clock-o" size={10} color="#64748b" />
          </View>
          <Text className="text-slate-600 text-xs font-bold">
            {data.timeSlot?.replace("_", " ")}
          </Text>
        </View>
      </View>

      {isApproved && !isPaid && (
        <TouchableOpacity
          onPress={() => onPay(data)}
          className="mt-5 bg-[#2eb8b8] py-4 rounded-2xl flex-row justify-center items-center shadow-md shadow-cyan-200"
        >
          <FontAwesome name="credit-card" size={14} color="white" />
          <Text className="text-white font-black ml-2">Secure Payment</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const PaymentOption = ({ icon, color, title, sub, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center bg-slate-50 p-4 rounded-3xl mb-4 border border-slate-100"
  >
    <View className={`${color} p-3 rounded-2xl`}>
      <MaterialCommunityIcons name={icon} size={24} color="white" />
    </View>
    <View className="ml-4 flex-1">
      <Text className="font-black text-slate-800">{title}</Text>
      <Text className="text-xs text-slate-400 font-medium">{sub}</Text>
    </View>
    <FontAwesome name="chevron-right" size={12} color="#cbd5e1" />
  </TouchableOpacity>
);
