import { FontAwesome, FontAwesome6 } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SAMPLE_DEPARTMENTS: Department[] = [
  {
    id: "101",
    name: "Cardiology",
    description:
      "Expert care for heart-related conditions using advanced diagnostic tools.",
    headOfDepartment: "Dr. Alice Smith",
    contactExtension: "101",
  },
  {
    id: "102",
    name: "Neurology",
    description:
      "Specialized treatment for disorders of the nervous system and brain.",
    headOfDepartment: "Dr. Bob Wilson",
    contactExtension: "102",
  },
  {
    id: "103",
    name: "Pediatrics",
    description:
      "Comprehensive healthcare services for infants, children, and adolescents.",
    headOfDepartment: "Dr. Carol Danvers",
    contactExtension: "103",
  },
  {
    id: "104",
    name: "Emergency",
    description:
      "24/7 critical care and rapid response for acute medical emergencies.",
    headOfDepartment: "Dr. Bruce Banner",
    contactExtension: "911",
  },
];

interface Department {
  id: string;
  name: string;
  description: string;
  headOfDepartment: string;
  contactExtension: string;
}

const DEPARTMENT_ICONS: Record<string, string> = {
  cardiology: "heart-pulse",
  neurology: "brain",
  pediatrics: "baby",
  orthopedics: "bone",
  dermatology: "hand-dots",
  radiology: "x-ray",
  emergency: "truck-medical",
  "general medicine": "stethoscope",
  default: "hospital",
};

export default function DepartmentDetails() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const numColumns = isWeb ? 3 : 1;

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://192.168.0.133:8080/api/departments/hospital/${id}`,
          { timeout: 4000 },
        );
        setDepartments(response.data);
      } catch (error) {
        console.error("Error fetching departments, using samples:", error);
        setDepartments(SAMPLE_DEPARTMENTS);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDepartments();
    else {
      setDepartments(SAMPLE_DEPARTMENTS);
      setLoading(false);
    }
  }, [id]);

  const getDepartmentIcon = (deptName: string) => {
    const lowerName = deptName.toLowerCase();
    return DEPARTMENT_ICONS[lowerName] || DEPARTMENT_ICONS.default;
  };

  const renderDepartmentCard = ({ item }: { item: Department }) => {
    const iconName = getDepartmentIcon(item.name);

    return (
      <View
        style={{ elevation: 4 }}
        className={`${
          isWeb ? "m-4 w-[30%]" : "mb-5 mx-2"
        } bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm`}
      >
        <View className="flex-row p-4 items-center">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center"
            style={{ backgroundColor: "#e0f7f7" }}
          >
            <FontAwesome6 name={iconName} size={28} color="#2eb8b8" />
          </View>

          <View className="ml-4 flex-1">
            <Text
              className="text-xl font-bold text-slate-800"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Ext: {item.contactExtension || "N/A"}
            </Text>
          </View>
        </View>

        <View className="px-4 pb-4">
          <Text
            className="text-slate-500 text-sm leading-5 mb-4"
            numberOfLines={3}
          >
            {item.description ||
              "Providing specialized medical care and advanced treatment options."}
          </Text>

          <View className="flex-row items-center justify-between pt-2 border-t border-slate-50">
            <View>
              <Text className="text-[10px] text-slate-400 uppercase font-bold">
                HOD
              </Text>
              <Text className="text-slate-700 text-xs font-semibold">
                {item.headOfDepartment || "Staff"}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                router.push({
                  pathname: "/extrafiles/doctors_details",
                  params: { id: item.id, name: item.name },
                });
              }}
              className="bg-[#2eb8b8] px-4 py-2 rounded-xl flex-row items-center"
            >
              <Text className="text-white text-xs font-bold mr-2">
                View Doctors
              </Text>
              <FontAwesome name="chevron-right" size={10} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={["#b1ebfc", "#5afad7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className={`${
          isWeb ? "py-6 px-10" : "pt-12 pb-6 px-6"
        } rounded-b-[40px] shadow-sm`}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <View className="bg-white/40 p-2 rounded-full">
            <FontAwesome name="chevron-left" size={16} color="#334155" />
          </View>
          <View className="ml-4">
            <Text className="text-slate-800 text-xs uppercase font-bold tracking-widest opacity-60">
              Department List
            </Text>
            <Text className="text-2xl font-black text-slate-900">
              {name || "Hospitals"}
            </Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2eb8b8" />
          <Text className="mt-4 text-slate-400 font-medium">
            Fetching Departments...
          </Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          data={departments}
          keyExtractor={(item) => item.id}
          renderItem={renderDepartmentCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center mt-20">
              <View className="bg-slate-100 p-10 rounded-full">
                <FontAwesome6 name="folder-open" size={50} color="#cbd5e1" />
              </View>
              <Text className="text-slate-400 mt-6 text-lg font-bold">
                No departments available
              </Text>
              <Text className="text-slate-400 text-sm">
                Please check back later.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
