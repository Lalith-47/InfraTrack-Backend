import readline from "readline";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "better-auth/crypto";
import { auth } from "../lib/auth.js";

function askQuestion(query: string, hideInput = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (!hideInput) {
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    } else {
      process.stdout.write(query);
      let input = "";
      const onData = (char: Buffer) => {
        const str = char.toString("utf8");
        switch (str) {
          case "\n":
          case "\r":
          case "\u0004":
            process.stdin.removeListener("data", onData);
            process.stdout.write("\n");
            rl.close();
            resolve(input.trim());
            break;
          case "\u0003": // Ctrl+C
            process.exit(1);
            break;
          case "\u0008":
          case "\x7f": // Backspace
            if (input.length > 0) {
              input = input.slice(0, -1);
              process.stdout.write("\b \b");
            }
            break;
          default:
            input += str;
            process.stdout.write("*");
            break;
        }
      };

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on("data", onData);
      } else {
        rl.question("", (ans) => {
          rl.close();
          resolve(ans.trim());
        });
      }
    }
  });
}

function parseArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  const prefix = `${flag}=`;
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  if (matched) {
    return matched.slice(prefix.length);
  }
  return null;
}

async function main() {
  console.log("\n🔐 InfraTrack Secure Admin Provisioning Tool\n");

  let email = parseArg("--email") || process.env.ADMIN_EMAIL;
  let password = parseArg("--password") || process.env.ADMIN_PASSWORD;
  let name = parseArg("--name") || process.env.ADMIN_NAME;

  if (!email) {
    email = await askQuestion("Enter Administrator Email: ");
  }
  if (!email || !email.includes("@")) {
    console.error("❌ A valid email address is required.");
    process.exit(1);
  }

  if (!password) {
    password = await askQuestion("Enter Administrator Password (min 8 chars): ", true);
  }
  if (!password || password.length < 8) {
    console.error("❌ Password must be at least 8 characters long.");
    process.exit(1);
  }

  if (!name) {
    name = await askQuestion("Enter Administrator Full Name (e.g. Director): ");
  }
  if (!name) {
    name = "System Administrator";
  }

  console.log(`\n⏳ Provisioning admin credential for ${email}...`);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const hashedPassword = await hashPassword(password);

  let userId: string;

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: "ADMIN",
        name,
        emailVerified: true,
      },
    });
    userId = updated.id;

    // Upsert credential account
    const existingAccount = await prisma.account.findFirst({
      where: { userId: existingUser.id, providerId: "credential" },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword },
      });
    } else {
      await prisma.account.create({
        data: {
          id: `acct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashedPassword,
        },
      });
    }

    console.log(`✅ Existing user updated to ADMIN role with new password!`);
  } else {
    // Register directly via auth API or prisma
    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!res || !res.user) {
      throw new Error("Failed to register credential with auth subsystem.");
    }

    userId = res.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: "ADMIN",
        emailVerified: true,
      },
    });

    console.log(`✅ New user registered and elevated to ADMIN role!`);
  }

  // Verify authentication immediately
  try {
    const check = await auth.api.signInEmail({
      body: { email, password },
    });
    console.log(`🎉 Login verification: SUCCESS!`);
    console.log(`   User ID: ${check.user.id}`);
    console.log(`   Email:   ${check.user.email}`);
    console.log(`   Role:    ${check.user.role}`);
    console.log(`\nYou can now sign in at the web portal using this credential.\n`);
  } catch (err: any) {
    console.error("⚠️ Note: Verification check returned:", err?.message || err);
  }
}

main()
  .catch((err) => {
    console.error("❌ Error provisioning admin:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
