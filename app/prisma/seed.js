// prisma/seed.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create sample clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: "Sarah Johnson",
        phone: "+1 (555) 123-4567",
        email: "sarah.johnson@email.com",
        address: "123 Fashion Ave, New York, NY 10001",
        notes: "Prefers loose-fitting garments, allergic to wool",
      },
    }),
    prisma.client.create({
      data: {
        name: "Maria Rodriguez",
        phone: "+1 (555) 987-6543",
        email: "maria.rodriguez@email.com",
        address: "456 Style St, Los Angeles, CA 90210",
        notes: "Regular client, loves bold colors and patterns",
      },
    }),
    prisma.client.create({
      data: {
        name: "Emma Thompson",
        phone: "+1 (555) 456-7890",
        email: "emma.thompson@email.com",
        address: "789 Couture Rd, Miami, FL 33101",
        notes: "Business professional wardrobe, prefers classic styles",
      },
    }),
    prisma.client.create({
      data: {
        name: "Aisha Patel",
        phone: "+1 (555) 321-0987",
        email: "aisha.patel@email.com",
        address: "321 Designer Blvd, Chicago, IL 60601",
        notes: "Bride-to-be, needs wedding dress and bridesmaid coordination",
      },
    }),
    prisma.client.create({
      data: {
        name: "Jennifer Chen",
        phone: "+1 (555) 654-3210",
        email: "jennifer.chen@email.com",
        address: "654 Trendy Lane, San Francisco, CA 94102",
        notes: "Petite sizing, loves contemporary fashion",
      },
    }),
  ]);

  console.log("✅ Created clients:", clients.length);

  // Create sample measurements for each client
  const measurements = [];

  // Sarah Johnson's measurements
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[0].id,
        shoulderToChest: 7.0,
        shoulderToBust: 11.5,
        shoulderToUnderbust: 15.0,
        shoulderToWaistFront: 18.0,
        shoulderToWaistBack: 15.0,
        waistToHip: 9.0,
        shoulderToKnee: 39.0,
        shoulderToDressLength: 41.0,
        shoulderToAnkle: 55.0,
        shoulderWidth: 17.0,
        bust: 40.5,
        underBust: 35.0,
        waist: 36.0,
        hip: 45.0,
        shirtSleeve: 8.0,
        elbowLength: 14.0,
        longSleeves: 23.0,
        aroundArm: 14.0,
        elbow: 11.0,
        wrist: 8.0,
        measurementType: "snug",
        notes: "Initial measurements for wedding dress consultation",
      },
    })
  );

  // Maria Rodriguez's measurements
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[1].id,
        shoulderToChest: 6.5,
        shoulderToBust: 10.5,
        shoulderToUnderbust: 14.5,
        shoulderToWaistFront: 17.5,
        shoulderToWaistBack: 14.5,
        waistToHip: 8.5,
        shoulderToKnee: 37.0,
        shoulderToDressLength: 39.0,
        shoulderToAnkle: 53.0,
        shoulderWidth: 16.5,
        bust: 38.0,
        underBust: 33.0,
        waist: 32.0,
        hip: 42.0,
        shirtSleeve: 7.5,
        elbowLength: 13.5,
        longSleeves: 22.0,
        aroundArm: 13.0,
        elbow: 10.5,
        wrist: 7.5,
        measurementType: "snug",
        notes: "Summer collection fitting",
      },
    })
  );

  // Emma Thompson's measurements
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[2].id,
        shoulderToChest: 7.5,
        shoulderToBust: 12.0,
        shoulderToUnderbust: 15.5,
        shoulderToWaistFront: 19.0,
        shoulderToWaistBack: 16.0,
        waistToHip: 9.5,
        shoulderToKnee: 40.0,
        shoulderToDressLength: 42.0,
        shoulderToAnkle: 56.0,
        shoulderWidth: 17.5,
        bust: 42.0,
        underBust: 36.0,
        waist: 34.0,
        hip: 44.0,
        shirtSleeve: 8.5,
        elbowLength: 14.5,
        longSleeves: 24.0,
        aroundArm: 14.5,
        elbow: 11.5,
        wrist: 8.5,
        measurementType: "static",
        notes: "Professional wardrobe consultation",
      },
    })
  );

  // Aisha Patel's measurements
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[3].id,
        shoulderToChest: 6.8,
        shoulderToBust: 11.2,
        shoulderToUnderbust: 14.8,
        shoulderToWaistFront: 18.2,
        shoulderToWaistBack: 15.2,
        waistToHip: 8.8,
        shoulderToKnee: 38.5,
        shoulderToDressLength: 40.5,
        shoulderToAnkle: 54.5,
        shoulderWidth: 16.8,
        bust: 39.5,
        underBust: 34.5,
        waist: 30.0,
        hip: 41.5,
        shirtSleeve: 7.8,
        elbowLength: 13.8,
        longSleeves: 22.5,
        aroundArm: 13.5,
        elbow: 10.8,
        wrist: 7.8,
        measurementType: "snug",
        notes: "Bridal measurements - final fitting scheduled",
      },
    })
  );

  // Jennifer Chen's measurements
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[4].id,
        shoulderToChest: 6.0,
        shoulderToBust: 10.0,
        shoulderToUnderbust: 13.5,
        shoulderToWaistFront: 16.5,
        shoulderToWaistBack: 14.0,
        waistToHip: 8.0,
        shoulderToKnee: 35.0,
        shoulderToDressLength: 37.0,
        shoulderToAnkle: 50.0,
        shoulderWidth: 15.5,
        bust: 36.0,
        underBust: 31.0,
        waist: 28.0,
        hip: 38.0,
        shirtSleeve: 7.0,
        elbowLength: 12.5,
        longSleeves: 20.0,
        aroundArm: 12.0,
        elbow: 9.5,
        wrist: 7.0,
        measurementType: "snug",
        notes: "Petite sizing consultation",
      },
    })
  );

  // Add some additional measurements for existing clients (measurement history)
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[0].id,
        shoulderToChest: 7.2,
        shoulderToBust: 11.8,
        shoulderToUnderbust: 15.2,
        shoulderToWaistFront: 18.2,
        shoulderToWaistBack: 15.2,
        waistToHip: 9.2,
        shoulderToKnee: 39.2,
        shoulderToDressLength: 41.2,
        shoulderToAnkle: 55.2,
        shoulderWidth: 17.2,
        bust: 40.8,
        underBust: 35.2,
        waist: 36.2,
        hip: 45.2,
        shirtSleeve: 8.2,
        elbowLength: 14.2,
        longSleeves: 23.2,
        aroundArm: 14.2,
        elbow: 11.2,
        wrist: 8.2,
        measurementType: "snug",
        notes: "Follow-up measurements after weight change",
      },
    })
  );

  console.log("✅ Created measurements:", measurements.length);

  console.log("🎉 Seeding completed successfully!");
  console.log(`📊 Total clients: ${clients.length}`);
  console.log(`📏 Total measurements: ${measurements.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
