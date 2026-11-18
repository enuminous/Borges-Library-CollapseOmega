"""Offline contract tests for Sophia's source-preserving repository inventory."""
import importlib.util
import pathlib
import unittest

source=pathlib.Path(__file__).resolve().parents[1]/"scripts"/"sophia_catalog.py"
spec=importlib.util.spec_from_file_location("sophia_catalog",source)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class SophiaTests(unittest.TestCase):
    def test_papers_documents(self):
        self.assertIn("papers_document",m.classify("Research-Paper.md","papers"))
        self.assertIn("document",m.classify("Report.docx","Rotation"))
    def test_results_and_proof(self):
        self.assertIn("data_or_result",m.classify("research/ROT-011_TERMINAL_LEDGER.json","Rotation"))
        self.assertIn("data_or_result",m.classify("EXP-003/results/metrics.csv","EFMW"))
        self.assertIn("reproducibility_source",m.classify("proof/Verification.lean","Zoo"))
    def test_no_recursive_self_catalogue(self):
        self.assertFalse(m.include("catalog/auto/manifest.json"))
        self.assertFalse(m.include("node_modules/foo/readme.md"))
        self.assertTrue(m.include("research/ROT-011_PROTOCOL.md"))
    def test_file_identity_and_no_earned_verdict(self):
        r=m.record("enuminous",{"name":"papers","default_branch":"main"},
                   {"path":"A # B.md","size":6,"sha":"a"*40})
        self.assertEqual(r["review_status"],"UNREVIEWED_METADATA_ONLY")
        self.assertIn("%23",r["url"])
        self.assertIn("%20",r["url"])
    def test_other_files_are_not_dropped(self):
        self.assertEqual(m.classify("firmware.bin","Rotation"),["other"])

if __name__=="__main__":
    unittest.main()
