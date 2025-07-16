// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a designer user
  const designer = await prisma.user.create({
    data: {
      name: "Pat Pat",
      email: "patience@enyaah.com",
      role: "DESIGNER",
      hashedPassword: await bcrypt.hash("password", 10),
    },
    data: {
      name: "admin admin",
      email: "admin@admin.com",
      role: "ADMIN",
      hashedPassword: await bcrypt.hash("password", 10),
    },
  });

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

  // Assign the first two clients to the designer
  await prisma.clientDesigner.createMany({
    data: [
      { clientId: clients[0].id, designerId: designer.id },
      { clientId: clients[1].id, designerId: designer.id },
    ],
  });

  console.log("✅ Assigned clients to designer");

  // Create sample measurements for each client
  const measurements = [];

  // Sarah Johnson's measurements - Complete set with all three types
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[0].id,
        creatorId: designer.id,
        // Vertical measurements
        shoulderToChestSnug: 7.0,
        shoulderToChestStatic: 7.2,
        shoulderToChestDynamic: 6.8,
        shoulderToBustSnug: 11.5,
        shoulderToBustStatic: 11.7,
        shoulderToBustDynamic: 11.3,
        shoulderToUnderbustSnug: 15.0,
        shoulderToUnderbustStatic: 15.2,
        shoulderToUnderbustDynamic: 14.8,
        shoulderToWaistFrontSnug: 18.0,
        shoulderToWaistFrontStatic: 18.2,
        shoulderToWaistFrontDynamic: 17.8,
        shoulderToWaistBackSnug: 15.0,
        shoulderToWaistBackStatic: 15.2,
        shoulderToWaistBackDynamic: 14.8,
        waistToHipSnug: 9.0,
        waistToHipStatic: 9.2,
        waistToHipDynamic: 8.8,
        shoulderToKneeSnug: 39.0,
        shoulderToKneeStatic: 39.2,
        shoulderToKneeDynamic: 38.8,
        shoulderToDressLengthSnug: 41.0,
        shoulderToDressLengthStatic: 41.2,
        shoulderToDressLengthDynamic: 40.8,
        shoulderToAnkleSnug: 55.0,
        shoulderToAnkleStatic: 55.2,
        shoulderToAnkleDynamic: 54.8,
        
        // Width measurements
        shoulderWidthSnug: 17.0,
        shoulderWidthStatic: 17.2,
        shoulderWidthDynamic: 16.8,
        
        // Circumference measurements
        bustSnug: 40.5,
        bustStatic: 41.0,
        bustDynamic: 40.0,
        underBustSnug: 35.0,
        underBustStatic: 35.5,
        underBustDynamic: 34.5,
        waistSnug: 36.0,
        waistStatic: 36.5,
        waistDynamic: 35.5,
        hipSnug: 45.0,
        hipStatic: 45.5,
        hipDynamic: 44.5,
        
        // Arm measurements
        shirtSleeveSnug: 8.0,
        shirtSleeveStatic: 8.2,
        shirtSleeveDynamic: 7.8,
        elbowLengthSnug: 14.0,
        elbowLengthStatic: 14.2,
        elbowLengthDynamic: 13.8,
        longSleevesSnug: 23.0,
        longSleevesStatic: 23.2,
        longSleevesDynamic: 22.8,
        aroundArmSnug: 14.0,
        aroundArmStatic: 14.5,
        aroundArmDynamic: 13.5,
        elbowSnug: 11.0,
        elbowStatic: 11.2,
        elbowDynamic: 10.8,
        wristSnug: 8.0,
        wristStatic: 8.2,
        wristDynamic: 7.8,
        
        notes: "Initial measurements for wedding dress consultation - all three measurement types",
      },
    })
  );

  // Maria Rodriguez's measurements - Mainly snug with some static
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[1].id,
        creatorId: designer.id,
        shoulderToChestSnug: 6.5,
        shoulderToChestStatic: 6.7,
        shoulderToBustSnug: 10.5,
        shoulderToBustStatic: 10.7,
        shoulderToUnderbustSnug: 14.5,
        shoulderToUnderbustStatic: 14.7,
        shoulderToWaistFrontSnug: 17.5,
        shoulderToWaistFrontStatic: 17.7,
        shoulderToWaistBackSnug: 14.5,
        shoulderToWaistBackStatic: 14.7,
        waistToHipSnug: 8.5,
        waistToHipStatic: 8.7,
        shoulderToKneeSnug: 37.0,
        shoulderToDressLengthSnug: 39.0,
        shoulderToAnkleSnug: 53.0,
        shoulderWidthSnug: 16.5,
        bustSnug: 38.0,
        bustStatic: 38.5,
        underBustSnug: 33.0,
        underBustStatic: 33.5,
        waistSnug: 32.0,
        waistStatic: 32.5,
        hipSnug: 42.0,
        hipStatic: 42.5,
        shirtSleeveSnug: 7.5,
        elbowLengthSnug: 13.5,
        longSleevesSnug: 22.0,
        aroundArmSnug: 13.0,
        aroundArmStatic: 13.5,
        elbowSnug: 10.5,
        wristSnug: 7.5,
        notes: "Summer collection fitting - focus on snug measurements",
      },
    })
  );

  // Emma Thompson's measurements - Professional wardrobe, static focus
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[2].id,
        creatorId: designer.id,
        shoulderToChestStatic: 7.5,
        shoulderToBustStatic: 12.0,
        shoulderToUnderbustStatic: 15.5,
        shoulderToWaistFrontStatic: 19.0,
        shoulderToWaistBackStatic: 16.0,
        waistToHipStatic: 9.5,
        shoulderToKneeStatic: 40.0,
        shoulderToDressLengthStatic: 42.0,
        shoulderToAnkleStatic: 56.0,
        shoulderWidthStatic: 17.5,
        bustStatic: 42.0,
        underBustStatic: 36.0,
        waistStatic: 34.0,
        hipStatic: 44.0,
        shirtSleeveStatic: 8.5,
        elbowLengthStatic: 14.5,
        longSleevesStatic: 24.0,
        aroundArmStatic: 14.5,
        elbowStatic: 11.5,
        wristStatic: 8.5,
        notes: "Professional wardrobe consultation - static measurements for structured garments",
      },
    })
  );

  // Aisha Patel's measurements - Bridal, mixed types
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[3].id,
        creatorId: designer.id,
        shoulderToChestSnug: 6.8,
        shoulderToChestStatic: 7.0,
        shoulderToBustSnug: 11.2,
        shoulderToBustStatic: 11.4,
        shoulderToUnderbustSnug: 14.8,
        shoulderToUnderbustStatic: 15.0,
        shoulderToWaistFrontSnug: 18.2,
        shoulderToWaistFrontStatic: 18.4,
        shoulderToWaistBackSnug: 15.2,
        shoulderToWaistBackStatic: 15.4,
        waistToHipSnug: 8.8,
        waistToHipStatic: 9.0,
        shoulderToKneeSnug: 38.5,
        shoulderToDressLengthSnug: 40.5,
        shoulderToAnkleSnug: 54.5,
        shoulderWidthSnug: 16.8,
        bustSnug: 39.5,
        bustStatic: 40.0,
        underBustSnug: 34.5,
        underBustStatic: 35.0,
        waistSnug: 30.0,
        waistStatic: 30.5,
        hipSnug: 41.5,
        hipStatic: 42.0,
        shirtSleeveSnug: 7.8,
        elbowLengthSnug: 13.8,
        longSleevesSnug: 22.5,
        aroundArmSnug: 13.5,
        aroundArmStatic: 14.0,
        elbowSnug: 10.8,
        wristSnug: 7.8,
        notes: "Bridal measurements - snug for fitted bodice, static for structured elements",
      },
    })
  );

  // Jennifer Chen's measurements - Petite, snug focus
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[4].id,
        creatorId: designer.id,
        shoulderToChestSnug: 6.0,
        shoulderToBustSnug: 10.0,
        shoulderToUnderbustSnug: 13.5,
        shoulderToWaistFrontSnug: 16.5,
        shoulderToWaistBackSnug: 14.0,
        waistToHipSnug: 8.0,
        shoulderToKneeSnug: 35.0,
        shoulderToDressLengthSnug: 37.0,
        shoulderToAnkleSnug: 50.0,
        shoulderWidthSnug: 15.5,
        bustSnug: 36.0,
        underBustSnug: 31.0,
        waistSnug: 28.0,
        hipSnug: 38.0,
        shirtSleeveSnug: 7.0,
        elbowLengthSnug: 12.5,
        longSleevesSnug: 20.0,
        aroundArmSnug: 12.0,
        elbowSnug: 9.5,
        wristSnug: 7.0,
        notes: "Petite sizing consultation - snug measurements for precise fit",
      },
    })
  );

  // Add follow-up measurements for Sarah (showing measurement evolution)
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[0].id,
        creatorId: designer.id,
        shoulderToChestSnug: 7.2,
        shoulderToChestStatic: 7.4,
        shoulderToBustSnug: 11.8,
        shoulderToBustStatic: 12.0,
        shoulderToUnderbustSnug: 15.2,
        shoulderToUnderbustStatic: 15.4,
        shoulderToWaistFrontSnug: 18.2,
        shoulderToWaistFrontStatic: 18.4,
        shoulderToWaistBackSnug: 15.2,
        shoulderToWaistBackStatic: 15.4,
        waistToHipSnug: 9.2,
        waistToHipStatic: 9.4,
        shoulderToKneeSnug: 39.2,
        shoulderToDressLengthSnug: 41.2,
        shoulderToAnkleSnug: 55.2,
        shoulderWidthSnug: 17.2,
        bustSnug: 40.8,
        bustStatic: 41.3,
        underBustSnug: 35.2,
        underBustStatic: 35.7,
        waistSnug: 36.2,
        waistStatic: 36.7,
        hipSnug: 45.2,
        hipStatic: 45.7,
        shirtSleeveSnug: 8.2,
        elbowLengthSnug: 14.2,
        longSleevesSnug: 23.2,
        aroundArmSnug: 14.2,
        aroundArmStatic: 14.7,
        elbowSnug: 11.2,
        wristSnug: 8.2,
        notes: "Follow-up measurements after weight change - updated snug and static",
      },
    })
  );

  // Add dynamic measurements example for Maria (active wear consultation)
  measurements.push(
    await prisma.measurement.create({
      data: {
        clientId: clients[1].id,
        creatorId: designer.id,
        shoulderToChestDynamic: 6.3,
        shoulderToBustDynamic: 10.3,
        shoulderToUnderbustDynamic: 14.3,
        shoulderToWaistFrontDynamic: 17.3,
        shoulderToWaistBackDynamic: 14.3,
        waistToHipDynamic: 8.3,
        shoulderToKneeDynamic: 36.8,
        shoulderToDressLengthDynamic: 38.8,
        shoulderToAnkleDynamic: 52.8,
        shoulderWidthDynamic: 16.3,
        bustDynamic: 37.5,
        underBustDynamic: 32.5,
        waistDynamic: 31.5,
        hipDynamic: 41.5,
        shirtSleeveDynamic: 7.3,
        elbowLengthDynamic: 13.3,
        longSleevesDynamic: 21.8,
        aroundArmDynamic: 12.8,
        elbowDynamic: 10.3,
        wristDynamic: 7.3,
        notes: "Active wear consultation - dynamic measurements for stretch fabrics and athletic wear",
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