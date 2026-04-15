"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { auth, db } from "./_lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
  getDocFromServer,
} from "firebase/firestore";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { Trash2, Plus } from "lucide-react";

interface Schedule {
  id: string;
  title: string;
  time: string;
  label: string;
}

export default function Home() {
  const [time, setTime] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now
          .toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\. /g, ".") +
          " — " +
          now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        setSchedules([]);
      }
    });

    return () => {
      clearInterval(timer);
      unsubscribeAuth();
    };
  }, []);

  // Real-time Schedules Listener
  useEffect(() => {
    if (!isAuthReady || !user) {
      return;
    }

    const q = query(
      collection(db, "schedules"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Schedule[];
        setSchedules(items);
      },
      (error) => {
        console.error("Firestore Error: ", error);
      },
    );

    return () => unsubscribe();
  }, [isAuthReady, user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "schedules", id));
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <main className="relative flex flex-col items-center justify-center w-full h-screen overflow-hidden">
          {/* Atmosphere Background */}
          <div className="atmosphere" />

          {/* Content Wrapper */}
          <div className="relative z-10 flex flex-col justify-between w-full h-full p-10 md:p-16">
            {/* Header */}
            <header className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-[0.2em] text-black/50">
                <div className="w-1.5 h-1.5 bg-[--color-accent] rounded-full shadow-[0_0_10px_var(--color-accent)] animate-pulse" />
                시스템 정상
              </div>
              <div className="flex items-center gap-4">
                {user ? (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/70 hover:bg-white/10 transition-all"
                    >
                      <Plus size={14} /> ADD EVENT
                    </button>
                    <button
                      onClick={() => auth.signOut()}
                      className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-black/50 hover:text-black transition-colors"
                    >
                      LOGOUT
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-black/50 hover:text-black transition-colors"
                  >
                    LOGIN
                  </button>
                )}
                <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-black/50">
                  V 2.0.4
                </div>
              </div>
            </header>

            {/* Clock */}
            <div className="absolute top-10 md:top-16 left-1/2 -translate-x-1/2 text-xs md:text-sm tracking-[0.2em] text-black/60 font-light">
              {time}
            </div>

            {/* Main Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="flex flex-col items-center justify-center flex-grow text-center"
            >
              <h1 className="font-serif text-8xl md:text-[140px] font-light tracking-tighter mb-5 text-shadow-lg">
                {user ? `안녕, ${user.displayName?.split(" ")[0]}` : "안녕"}
              </h1>
              <p className="text-sm md:text-lg font-light tracking-[0.3em] uppercase text-black/60">
                오늘도 특별한 하루가 되길
              </p>
            </motion.div>

            {/* Bottom Interface */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-auto">
              <GlassCard
                label="WEATHER"
                value="24°C / 맑음"
                meta="서울, 대한민국"
                delay={0.2}
              />

              <div className="relative group">
                <GlassCard
                  label={schedules[0]?.label || "UPCOMING"}
                  value={
                    schedules[0]?.title || (user ? "일정 없음" : "로그인 필요")
                  }
                  meta={
                    schedules[0]?.time ||
                    (user
                      ? "새 일정을 추가해보세요"
                      : "일정을 확인하려면 로그인하세요")
                  }
                  delay={0.4}
                />
                {schedules[0] && (
                  <button
                    onClick={(e) => handleDelete(schedules[0].id, e)}
                    className="absolute top-4 right-4 p-2 text-white/0 group-hover:text-white/40 hover:!text-red-400 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <GlassCard
                label="ATMOSPHERE"
                value="고요한 새벽"
                meta="현재 재생 중: Lo-fi Beats"
                delay={0.6}
              />
            </div>
          </div>

          {/* {user && (
            <AddScheduleModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              uid={user.uid}
            />
          )} */}
        </main>
      </main>
    </div>
  );
}

function GlassCard({
  label,
  value,
  meta,
  delay,
}: {
  label: string;
  value: string;
  meta: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      className="glass-card"
    >
      <span className="block text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">
        {label}
      </span>
      <div className="text-xl md:text-2xl font-light mb-1">{value}</div>
      <div className="text-xs text-white/40">{meta}</div>
    </motion.div>
  );
}
