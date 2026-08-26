import sys
with open(sys.argv[1], chr(39)+chr(39).join([chr(119),chr(44),chr(101),chr(110),chr(99),chr(111),chr(100),chr(105),chr(110),chr(103),chr(61),chr(117),chr(116),chr(102),chr(45),chr(56)])) as f:
  f.write(sys.argv[2])
