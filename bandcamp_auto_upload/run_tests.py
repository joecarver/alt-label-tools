#!/usr/bin/env python3
"""
Comprehensive Test Runner for Bandcamp Automation
Orchestrates the entire testing workflow from setup to upload
"""

import sys
import os
import subprocess
import time
from datetime import datetime

def run_command(command, description):
    """Run a command and return success status."""
    print(f"\n🔄 {description}...")
    print(f"📋 Command: {command}")
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} - SUCCESS")
            if result.stdout.strip():
                print(f"📄 Output: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ {description} - FAILED")
            if result.stderr.strip():
                print(f"🚨 Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"❌ {description} - EXCEPTION: {e}")
        return False

def check_dependencies():
    """Check if all required Python packages are installed."""
    print("📦 Checking dependencies...")
    
    required_packages = ['selenium', 'supabase', 'webdriver-manager']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package} - installed")
        except ImportError:
            print(f"❌ {package} - MISSING")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n🚨 Missing packages: {', '.join(missing_packages)}")
        print("💡 Install with: pip install -r requirements.txt")
        return False
    
    return True

def main():
    """Main test runner function."""
    print("🧪 BANDCAMP AUTOMATION - COMPREHENSIVE TEST RUNNER")
    print("=" * 60)
    print(f"🕐 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test workflow steps
    test_steps = [
        ("python -c \"import sys; print('Python version:', sys.version)\"", "Check Python version"),
        ("pip list | findstr -i \"selenium supabase webdriver\"", "Check installed packages"),
        ("python check_database_tables.py", "Verify database tables"),
        ("python check_credentials.py", "Check stored credentials"),
        ("python create_test_audio.py", "Generate test audio files"),
        ("python create_test_release_with_files.py", "Create test release data"),
        ("python bandcamp_automation.py --user-id 1", "Test login functionality"),
    ]
    
    print("\n📋 TEST WORKFLOW:")
    for i, (command, description) in enumerate(test_steps, 1):
        print(f"   {i}. {description}")
    
    # Check dependencies first
    if not check_dependencies():
        print("\n❌ Dependency check failed. Please install required packages.")
        return False
    
    # Run tests
    print(f"\n{'='*60}")
    print("🚀 STARTING TESTS")
    print(f"{'='*60}")
    
    passed = 0
    failed = 0
    
    for i, (command, description) in enumerate(test_steps, 1):
        print(f"\n{'─'*60}")
        print(f"🧪 TEST {i}/{len(test_steps)}: {description}")
        print(f"{'─'*60}")
        
        if run_command(command, description):
            passed += 1
        else:
            failed += 1
        
        # Small delay between tests
        time.sleep(1)
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print(f"{'='*60}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total: {len(test_steps)}")
    print(f"🕐 Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED! Your Bandcamp automation is ready to use.")
        print("\n🚀 Next steps:")
        print("1. Run full upload test: python bandcamp_automation.py --upload --user-id 1")
        print("2. Monitor the automation.log file for detailed logs")
        print("3. Check screenshots/ folder if any errors occur")
    else:
        print(f"\n⚠️ {failed} TEST(S) FAILED. Please check the errors above.")
        print("\n🔧 Troubleshooting:")
        print("1. Ensure Supabase credentials are correctly set in config.py")
        print("2. Verify database tables are created (run setup scripts)")
        print("3. Check that test files exist in C:/temp/bandcamp_test_music/")
    
    return failed == 0

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️ Tests cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error in test runner: {e}")
        sys.exit(1) 