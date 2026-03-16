1. Continuous GPS Tracking (Hook)
สร้าง useUserLocation() hook ที่ใช้ navigator.geolocation.watchPosition() เพื่อ track ตำแหน่งผู้ใช้ต่อเนื่อง (ไม่ใช่ one-shot)

จัดการ permission request
จัดการ error states (denied, unavailable, timeout)
ให้ { lat, lng, accuracy, heading } ที่ update เรื่อยๆ
2. User Position Marker บนแผนที่
แสดง "จุดน้ำเงิน" (blue dot) ตำแหน่งผู้ใช้บน MapView พร้อม accuracy circle

ใช้ <Map.Marker> จาก mapcn ที่มีอยู่แล้ว
Animate การเคลื่อนที่ให้ smooth
3. Proximity Calculation (Core Logic)
ฟังก์ชัน getDistanceToStop(userLat, userLng, stop) → คำนวณระยะทางด้วย Haversine formula

คำนวณระยะผู้ใช้ถึงทุกป้าย
หาป้ายที่ใกล้ที่สุด (nearest stop)
ระบุว่าผู้ใช้อยู่ในรัศมีของป้ายไหนบ้าง (เช่น ≤ 50m, ≤ 100m)
4. Proximity Alert / UI Feedback
แจ้งผู้ใช้เมื่อเข้าใกล้ป้าย:

แสดง nearest stop + ระยะทาง บน UI
Notification/toast เมื่อเข้ารัศมีที่กำหนด (geofencing)
(Optional) Push Notification ผ่าน Web Push API
5. Stop Detail Enhancement
ปรับ StopPopup ให้แสดงระยะทางจากผู้ใช้ถึงป้ายนั้นๆ (เช่น "120 เมตรจากคุณ")

6. Performance & Battery Considerations
ลด frequency ของ GPS updates เมื่อ app อยู่ background
ใช้ enableHighAccuracy อย่างเหมาะสม
Clean up watchPosition เมื่อ component unmount
📋 ลำดับการทำที่แนะนำ
ลำดับ	งาน	ความยาก
1	useUserLocation hook (continuous tracking)	⭐⭐
2	User position marker บนแผนที่	⭐
3	haversineDistance utility + nearest stop logic	⭐⭐
4	แสดงระยะทางใน StopPopup & Nearest stop UI	⭐⭐
5	Proximity alert / geofencing notification	⭐⭐⭐